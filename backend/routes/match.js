const express = require('express');
const router = express.Router();
const { matchCandidateToJob } = require('../services/matcher');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const mongoose = require('mongoose');
const store = require('../db/store');

const handleMatch = async (req, res) => {
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

    if (!candidate && store.candidates.length > 0) candidate = store.candidates[0];
    if (!job && store.jobs.length > 0) job = store.jobs[0];

    const result = await matchCandidateToJob(candidate, job);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error running match:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/', handleMatch);
router.post('/candidate', handleMatch);

module.exports = router;
