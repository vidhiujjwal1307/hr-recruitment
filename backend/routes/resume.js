const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { parseResume } = require('../services/resumeParser');
const Candidate = require('../models/Candidate');
const mongoose = require('mongoose');
const store = require('../db/store');

const handleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a valid PDF resume file.' });
    }

    // Parse PDF text and extract candidate JSON via LLM
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
      });
      savedCandidate = await candidate.save();
    } else {
      // In-memory fallback
      savedCandidate = {
        _id: 'cand_' + Date.now(),
        name: parsedData.name,
        email: parsedData.email,
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        rawText: parsedData.rawText,
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

// Route definitions supporting all path variations
router.post('/upload-resume', upload.single('resume'), handleUpload);
router.post('/', upload.single('resume'), handleUpload);

router.get('/candidates', handleGetCandidates);
router.get('/', handleGetCandidates);

module.exports = router;
