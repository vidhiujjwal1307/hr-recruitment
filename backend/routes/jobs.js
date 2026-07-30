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

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job posting
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let deletedJob;

    if (mongoose.connection.readyState === 1) {
      deletedJob = await Job.findByIdAndDelete(id);
    } else {
      const index = store.jobs.findIndex((j) => String(j._id) === String(id));
      if (index !== -1) {
        deletedJob = store.jobs.splice(index, 1)[0];
      }
    }

    if (!deletedJob) {
      return res.status(404).json({ success: false, message: 'Job posting not found.' });
    }

    return res.json({ success: true, message: 'Job posting deleted successfully.', data: deletedJob });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
