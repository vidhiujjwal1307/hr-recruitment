const express = require('express');
const router = express.Router();
const { generateInterviewQuestions } = require('../services/questionGenerator');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const mongoose = require('mongoose');
const store = require('../db/store');

const handleGenerate = async (req, res) => {
  try {
    const { candidateId, jobId } = req.body;
    let candidate, job;

    if (mongoose.connection.readyState === 1) {
      if (candidateId) candidate = await Candidate.findById(candidateId);
      if (jobId) job = await Job.findById(jobId);
    }

    if (!candidate && candidateId) {
      candidate = store.candidates.find((c) => String(c._id) === String(candidateId));
    }
    if (!job && jobId) {
      job = store.jobs.find((j) => String(j._id) === String(jobId));
    }

    if (!candidate) candidate = { name: 'Candidate', skills: ['Software Development'] };
    if (!job) job = { title: 'Software Role', requirements: [] };

    const questions = await generateInterviewQuestions(candidate, job);
    return res.json({ success: true, data: { candidateId, jobId, questions } });
  } catch (error) {
    console.error('Error generating questions:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/generate', handleGenerate);
router.post('/generate-questions', handleGenerate);
router.post('/', handleGenerate);

module.exports = router;
