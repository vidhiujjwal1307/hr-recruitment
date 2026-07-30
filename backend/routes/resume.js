const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { parseResume } = require('../services/resumeParser');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const VideoInterview = require('../models/VideoInterview');
const mongoose = require('mongoose');
const store = require('../db/store');
const { callLLM } = require('../utils/llmClient');

const handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a valid PDF resume file.' });
    }

    const parsedData = await parseResume(req.file.buffer);

    let savedCandidate;
    if (mongoose.connection.readyState === 1) {
      const candidate = new Candidate({
        name: parsedData.name,
        email: parsedData.email,
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        rawText: parsedData.rawText,
        status: 'Applied',
      });
      savedCandidate = await candidate.save();
    } else {
      savedCandidate = {
        _id: 'cand_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: parsedData.name,
        email: parsedData.email,
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        rawText: parsedData.rawText,
        status: 'Applied',
        createdAt: new Date(),
      };
      store.candidates.unshift(savedCandidate);
    }

    return res.status(201).json({
      success: true,
      message: 'Resume parsed and candidate saved successfully.',
      data: savedCandidate,
    });
  } catch (error) {
    console.error('Error handling resume upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to parse and save resume.',
      error: error.message,
    });
  }
};

const handleBulkUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one valid PDF resume file.' });
    }

    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const parsedData = await parseResume(file.buffer);
        let savedCandidate;

        if (mongoose.connection.readyState === 1) {
          const candidate = new Candidate({
            name: parsedData.name,
            email: parsedData.email,
            skills: parsedData.skills,
            experience: parsedData.experience,
            education: parsedData.education,
            rawText: parsedData.rawText,
            status: 'Applied',
          });
          savedCandidate = await candidate.save();
        } else {
          savedCandidate = {
            _id: 'cand_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: parsedData.name,
            email: parsedData.email,
            skills: parsedData.skills,
            experience: parsedData.experience,
            education: parsedData.education,
            rawText: parsedData.rawText,
            status: 'Applied',
            createdAt: new Date(),
          };
          store.candidates.unshift(savedCandidate);
        }

        results.push({ fileName: file.originalname, candidate: savedCandidate, success: true });
      } catch (fileErr) {
        console.error(`Error parsing bulk file ${file.originalname}:`, fileErr);
        errors.push({ fileName: file.originalname, error: fileErr.message, success: false });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk processing complete. Successfully parsed ${results.length} of ${req.files.length} resumes.`,
      data: {
        total: req.files.length,
        successfulCount: results.length,
        failedCount: errors.length,
        results,
        errors,
      },
    });
  } catch (error) {
    console.error('Error handling bulk resume upload:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process bulk resume uploads.',
      error: error.message,
    });
  }
};

const handleGetCandidates = async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const candidates = await Candidate.find().sort({ createdAt: -1 });
      return res.status(200).json({ success: true, count: candidates.length, data: candidates });
    } else {
      return res.status(200).json({ success: true, count: store.candidates.length, data: store.candidates });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleUpdateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Applied', 'Screened', 'Interview', 'Offered', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    let updatedCandidate;
    if (mongoose.connection.readyState === 1) {
      updatedCandidate = await Candidate.findByIdAndUpdate(id, { status }, { new: true });
    } else {
      const candidateIndex = store.candidates.findIndex((c) => String(c._id) === String(id));
      if (candidateIndex !== -1) {
        store.candidates[candidateIndex].status = status;
        updatedCandidate = store.candidates[candidateIndex];
      }
    }

    if (!updatedCandidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    return res.status(200).json({
      success: true,
      message: `Candidate status updated to '${status}'.`,
      data: updatedCandidate,
    });
  } catch (error) {
    console.error('Error updating candidate status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleCandidateQA = async (req, res) => {
  try {
    const { candidateId, question } = req.body;

    if (!candidateId || !question) {
      return res.status(400).json({ success: false, message: 'Candidate ID and question are required.' });
    }

    let candidate;
    if (mongoose.connection.readyState === 1) {
      candidate = await Candidate.findById(candidateId);
    } else {
      candidate = store.candidates.find((c) => String(c._id) === String(candidateId));
    }

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    const contextText = `
Candidate Name: ${candidate.name}
Email: ${candidate.email}
Status: ${candidate.status || 'Applied'}
Skills: ${Array.isArray(candidate.skills) ? candidate.skills.join(', ') : ''}

Experience:
${JSON.stringify(candidate.experience || [], null, 2)}

Education:
${JSON.stringify(candidate.education || [], null, 2)}

Full Resume Text:
${candidate.rawText || 'No raw text available.'}
`;

    const systemPrompt = `You are an expert HR recruitment assistant specializing in retrieval-augmented analysis (RAG) of candidate resumes.
Your goal is to answer the recruiter's question accurately, concisely, and objectively based STRICTLY on the candidate's resume and details provided in the context below.

Instructions:
1. Provide a direct, clear answer to the recruiter's question.
2. Cite relevant parts of their resume experience, skills, or education if applicable.
3. If the resume does not contain information to answer the question, state that clearly without guessing.
4. Keep formatting clean with bullet points where appropriate.`;

    const prompt = `Context Resume Information:\n${contextText}\n\nRecruiter Question: ${question}`;

    let answer;
    try {
      answer = await callLLM(prompt, systemPrompt);
    } catch (llmErr) {
      console.warn('[QA] LLM invocation failed, fallback response generated:', llmErr.message);
    }

    if (!answer) {
      // Fallback simple search Q&A
      const qLower = question.toLowerCase();
      if (qLower.includes('skill') || qLower.includes('technolog')) {
        answer = `**Skills Extracted from Resume:**\n${candidate.skills.map((s) => `- ${s}`).join('\n') || 'None listed.'}`;
      } else if (qLower.includes('experience') || qLower.includes('work') || qLower.includes('job')) {
        answer = `**Work Experience Summary:**\n${candidate.experience.map((e) => `- **${e.role || e.title || 'Role'}** at ${e.company || 'Company'} (${e.duration || 'N/A'}): ${e.description || ''}`).join('\n') || candidate.rawText.slice(0, 300)}`;
      } else if (qLower.includes('education') || qLower.includes('degree') || qLower.includes('college')) {
        answer = `**Education:**\n${candidate.education.map((ed) => `- ${ed.degree || 'Degree'} from ${ed.institution || 'Institution'} (${ed.year || 'N/A'})`).join('\n') || 'Not explicitly detailed.'}`;
      } else {
        answer = `**Summary for ${candidate.name}:**\n- Skills: ${candidate.skills.join(', ')}\n- Resume Snippet: "${candidate.rawText.slice(0, 250)}..."`;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        candidateId,
        candidateName: candidate.name,
        question,
        answer,
        timestamp: new Date(),
      },
    });
  } catch (error) {
    console.error('Error handling candidate Q&A:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleGetAnalytics = async (req, res) => {
  try {
    let candidateList = [];
    let jobList = [];
    let videoInterviewsList = [];

    if (mongoose.connection.readyState === 1) {
      candidateList = await Candidate.find();
      jobList = await Job.find();
      videoInterviewsList = await VideoInterview.find();
    } else {
      candidateList = store.candidates || [];
      jobList = store.jobs || [];
      videoInterviewsList = store.videoInterviews || [];
    }

    // Pipeline status distribution
    const pipelineCounts = {
      Applied: 0,
      Screened: 0,
      Interview: 0,
      Offered: 0,
      Rejected: 0,
    };

    const skillCounts = {};

    candidateList.forEach((c) => {
      const st = c.status || 'Applied';
      if (pipelineCounts[st] !== undefined) {
        pipelineCounts[st]++;
      } else {
        pipelineCounts.Applied++;
      }

      if (Array.isArray(c.skills)) {
        c.skills.forEach((skill) => {
          const s = skill.trim();
          if (s) {
            skillCounts[s] = (skillCounts[s] || 0) + 1;
          }
        });
      }
    });

    const topSkills = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const analyticsData = {
      totalCandidates: candidateList.length,
      totalJobs: jobList.length,
      totalVideoInterviews: videoInterviewsList.length,
      pipelineBreakdown: pipelineCounts,
      topSkills,
      recentCandidates: candidateList.slice(0, 5).map((c) => ({
        id: c._id,
        name: c.name,
        email: c.email,
        status: c.status || 'Applied',
        skillsCount: c.skills?.length || 0,
        createdAt: c.createdAt,
      })),
    };

    return res.status(200).json({ success: true, data: analyticsData });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const handleDeleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    let deletedCandidate;

    if (mongoose.connection.readyState === 1) {
      deletedCandidate = await Candidate.findByIdAndDelete(id);
    } else {
      const index = store.candidates.findIndex((c) => String(c._id) === String(id));
      if (index !== -1) {
        deletedCandidate = store.candidates.splice(index, 1)[0];
      }
    }

    if (!deletedCandidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully from database.',
      data: deletedCandidate,
    });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Route definitions supporting all path variations
router.post('/upload-resume', upload.single('resume'), handleUpload);
router.post('/upload-bulk', upload.array('resumes', 15), handleBulkUpload);
router.post('/upload', upload.single('resume'), handleUpload);
router.post('/', upload.single('resume'), handleUpload);

router.get('/candidates', handleGetCandidates);
router.get('/', handleGetCandidates);

router.patch('/candidates/:id/status', handleUpdateStatus);
router.patch('/:id/status', handleUpdateStatus);

router.delete('/candidates/:id', handleDeleteCandidate);
router.delete('/:id', handleDeleteCandidate);

router.post('/qa', handleCandidateQA);
router.post('/candidate-qa', handleCandidateQA);

router.get('/analytics', handleGetAnalytics);

module.exports = router;
