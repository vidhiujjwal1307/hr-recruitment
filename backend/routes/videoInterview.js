const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { requireAuth } = require('../middleware/auth');
const videoUpload = require('../middleware/videoUpload');
const VideoInterview = require('../models/VideoInterview');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const { analyzeVideoInterview } = require('../services/videoAnalyzer');
const store = require('../db/store');
const { sendVideoInterviewInvite } = require('../services/emailService');

const router = express.Router();
const permanentDirectory = path.join(__dirname, '..', 'uploads', 'video-interviews', 'videos');
fs.mkdirSync(permanentDirectory, { recursive: true });

const usesMongo = () => mongoose.connection.readyState === 1;

function publicInterview(interview) {
  return { id: interview._id, question: interview.question, status: interview.status, errorMessage: interview.errorMessage || '' };
}

async function verifyCandidateAndJob(candidateId, jobId) {
  if (usesMongo() && (!mongoose.isValidObjectId(candidateId) || !mongoose.isValidObjectId(jobId))) throw new Error('A valid candidate and job are required.');
  const [candidate, job] = usesMongo()
    ? await Promise.all([Candidate.findById(candidateId), Job.findById(jobId)])
    : [store.candidates.find((item) => String(item._id || item.id) === String(candidateId)), store.jobs.find((item) => String(item._id || item.id) === String(jobId))];
  if (!candidate || !job) throw new Error('Candidate or job not found.');
  return { candidate, job };
}

async function createInterview(data) {
  if (usesMongo()) return VideoInterview.create(data);
  const interview = { _id: `video_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`, ...data, transcript: '', summary: '', followUpQuestions: [], errorMessage: '', createdAt: new Date() };
  store.videoInterviews.unshift(interview);
  return interview;
}

async function findInterviewById(id) {
  return usesMongo() ? VideoInterview.findById(id) : store.videoInterviews.find((item) => String(item._id) === String(id));
}

async function findInterviewByToken(token) {
  return usesMongo() ? VideoInterview.findOne({ accessToken: token }) : store.videoInterviews.find((item) => item.accessToken === token);
}

async function updateInterview(id, fields) {
  if (usesMongo()) return VideoInterview.findByIdAndUpdate(id, { $set: fields }, { new: true });
  const interview = await findInterviewById(id);
  if (interview) Object.assign(interview, fields);
  return interview;
}

async function processInterview(interviewId, jobDescription) {
  try {
    const interview = await findInterviewById(interviewId);
    if (!interview?.videoPath) throw new Error('Interview video was not found.');
    const result = await analyzeVideoInterview(interview.videoPath, jobDescription, interview.question);
    await updateInterview(interviewId, { ...result, status: 'completed', errorMessage: '' });
  } catch (error) {
    console.error(`Video interview ${interviewId} failed:`, error.message);
    await updateInterview(interviewId, { status: 'failed', errorMessage: 'Video analysis failed. Please try another recording.' });
  }
}

async function attachVideoAndProcess(interview, file) {
  if (!file) throw new Error('Please attach an MP4, WebM, or MOV video.');
  const finalPath = path.join(permanentDirectory, `${interview._id}${path.extname(file.filename) || '.webm'}`);
  await fs.promises.rename(file.path, finalPath);
  const { job } = await verifyCandidateAndJob(interview.candidateId, interview.jobId);
  await updateInterview(interview._id, { videoPath: finalPath, status: 'processing', errorMessage: '' });
  setImmediate(() => processInterview(interview._id.toString(), job.description));
}

router.post('/request', requireAuth, async (req, res) => {
  try {
    const { candidateId, jobId, question } = req.body;
    if (!String(question || '').trim()) return res.status(400).json({ success: false, message: 'An interview question is required.' });
    console.log('Creating video interview request with IDs:', { candidateId, jobId });
    const { candidate } = await verifyCandidateAndJob(candidateId, jobId);
    const interview = await createInterview({ candidateId, jobId, question: question.trim(), videoPath: '', status: 'pending', accessToken: crypto.randomBytes(32).toString('hex') });
    const sharePath = `/video-interview/${interview.accessToken}`;
    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`;
    const videoInterviewLink = `${frontendBaseUrl.replace(/\/$/, '')}${sharePath}`;
    let emailSent = false;
    try {
      if (!candidate.email) throw new Error('Candidate does not have an email address.');
      await sendVideoInterviewInvite(candidate.email, { question: interview.question, videoInterviewLink });
      emailSent = true;
    } catch (emailError) {
      console.warn(`Video interview link created, but email delivery to ${candidate.email || 'candidate'} failed:`, emailError.message);
    }
    return res.status(201).json({ success: true, data: { interviewId: interview._id, sharePath, emailSent } });
  } catch (error) {
    return res.status(error.message.includes('required') || error.message.includes('not found') ? 400 : 500).json({ success: false, message: error.message || 'Could not create video interview request.' });
  }
});

router.post('/upload', requireAuth, videoUpload.single('video'), async (req, res) => {
  try {
    const { candidateId, jobId, question } = req.body;
    if (!String(question || '').trim()) return res.status(400).json({ success: false, message: 'An interview question is required.' });
    console.log('Creating video interview request with IDs:', { candidateId, jobId });
    await verifyCandidateAndJob(candidateId, jobId);
    const interview = await createInterview({ candidateId, jobId, question: question.trim(), videoPath: '', status: 'pending', accessToken: crypto.randomBytes(32).toString('hex') });
    await attachVideoAndProcess(interview, req.file);
    return res.status(202).json({ success: true, data: { interviewId: interview._id, status: 'processing' } });
  } catch (error) {
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ success: false, message: error.message || 'Could not upload video interview.' });
  }
});

router.get('/candidate/:candidateId', requireAuth, async (req, res) => {
  try {
    const interviews = usesMongo()
      ? await VideoInterview.find({ candidateId: req.params.candidateId }).sort({ createdAt: -1 }).select('-accessToken')
      : store.videoInterviews.filter((item) => String(item.candidateId) === String(req.params.candidateId)).sort((a, b) => b.createdAt - a.createdAt).map(({ accessToken, ...interview }) => interview);
    return res.json({ success: true, data: interviews });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Could not load video interviews.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const interview = usesMongo() ? await VideoInterview.findById(req.params.id).select('-accessToken') : await findInterviewById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Video interview not found.' });
    return res.json({ success: true, data: interview });
  } catch (error) {
    return res.status(400).json({ success: false, message: 'Invalid video interview ID.' });
  }
});

router.get('/public/:token', async (req, res) => {
  const interview = await findInterviewByToken(req.params.token);
  if (!interview) return res.status(404).json({ success: false, message: 'Interview link is invalid or has expired.' });
  return res.json({ success: true, data: publicInterview(interview) });
});

router.post('/public/:token/upload', videoUpload.single('video'), async (req, res) => {
  try {
    const interview = await findInterviewByToken(req.params.token);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview link is invalid or has expired.' });
    if (interview.status === 'processing') return res.status(409).json({ success: false, message: 'This interview is already processing.' });
    if (interview.status === 'completed') return res.status(409).json({ success: false, message: 'This interview has already been submitted.' });
    await attachVideoAndProcess(interview, req.file);
    return res.status(202).json({ success: true, data: publicInterview(interview) });
  } catch (error) {
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ success: false, message: error.message || 'Could not submit video.' });
  }
});

module.exports = router;
