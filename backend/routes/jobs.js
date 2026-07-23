const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const mongoose = require('mongoose');
const store = require('../db/store');

/**
 * @route   GET /api/jobs
 * @desc    Get all job postings
 */
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const jobs = await Job.find().sort({ createdAt: -1 });
      return res.json({ success: true, count: jobs.length, data: jobs });
    } else {
      return res.json({ success: true, count: store.jobs.length, data: store.jobs });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @route   POST /api/jobs
 * @desc    Create a new job posting
 */
router.post('/', async (req, res) => {
  try {
    const { title, description, requirements, location } = req.body;

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Job title is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, message: 'Job description is required.' });
    }

    const formattedRequirements = Array.isArray(requirements)
      ? requirements
      : typeof requirements === 'string'
      ? requirements.split(',').map((r) => r.trim()).filter(Boolean)
      : [];

    if (mongoose.connection.readyState === 1) {
      const job = new Job({
        title: title.trim(),
        description: description.trim(),
        requirements: formattedRequirements,
        location: location ? location.trim() : 'Remote',
      });
      const savedJob = await job.save();
      return res.status(201).json({ success: true, message: 'Job posted successfully!', data: savedJob });
    } else {
      const newJob = {
        _id: 'job_' + Date.now(),
        title: title.trim(),
        description: description.trim(),
        requirements: formattedRequirements,
        location: location ? location.trim() : 'Remote',
        createdAt: new Date(),
      };
      store.jobs.unshift(newJob);
      return res.status(201).json({ success: true, message: 'Job posted successfully!', data: newJob });
    }
  } catch (error) {
    console.error('Error creating job:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error creating job posting.' });
  }
});

module.exports = router;
