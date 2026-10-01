const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const { sendInterviewInvite } = require('../services/emailService');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, message: 'Interview data is unavailable because the database connection is not active.' });
    const interviews = await Interview.find().sort({ scheduledDate: 1 }).populate('candidateId', 'name email skills status').populate('jobId', 'title');
    return res.json({ success: true, count: interviews.length, data: interviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Could not load interviews.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, message: 'Interview updates are unavailable because the database connection is not active.' });
    const { status } = req.body;
    if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid interview status.' });
    }
    let interview;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      interview = await Interview.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('candidateId', 'name email skills status').populate('jobId', 'title');
    }
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    return res.json({ success: true, data: interview });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Could not update interview.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, message: 'Interview updates are unavailable because the database connection is not active.' });
    const { scheduledDate, interviewerEmail } = req.body;
    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: 'A new interview date and time are required.' });
    }
    if (Number.isNaN(new Date(scheduledDate).getTime())) return res.status(400).json({ success: false, message: 'Invalid interview date.' });
    let interview;
    if (mongoose.Types.ObjectId.isValid(req.params.id)) interview = await Interview.findByIdAndUpdate(req.params.id, { scheduledDate, interviewerEmail: String(interviewerEmail || '').trim() }, { new: true, runValidators: true }).populate('candidateId', 'name email skills status').populate('jobId', 'title');
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    const candidate = interview.candidateId;
    const job = interview.jobId;
    if (candidate?.email) {
      try { await sendInterviewInvite(candidate.email, { jobTitle: job?.title || 'the position', dateTime: scheduledDate }); }
      catch (emailError) { console.warn('Reschedule notification warning:', emailError.message); }
    }
    return res.json({ success: true, data: interview });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Could not reschedule interview.' });
  }
});

const handleSchedule = async (req, res) => {
  try {
    const { candidateId, jobId, scheduledDate, interviewerEmail, candidateEmail, questions, interviewType, durationMinutes } = req.body;
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ success: false, message: 'Interview scheduling is unavailable because the database connection is not active.' });
    if (!candidateId || !jobId || !mongoose.Types.ObjectId.isValid(candidateId) || !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ success: false, message: 'A valid candidate and job are required.' });
    }
    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: 'Scheduled date and time are required.' });
    }
    const parsedScheduledDate = new Date(scheduledDate);
    if (Number.isNaN(parsedScheduledDate.getTime())) return res.status(400).json({ success: false, message: 'Invalid interview date.' });
    if (parsedScheduledDate.getTime() <= Date.now()) return res.status(400).json({ success: false, message: 'Interview date must be in the future.' });
    const [candidate, job] = await Promise.all([Candidate.findById(candidateId), Job.findById(jobId)]);
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found.' });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found.' });
    const interview = new Interview({
      candidateId,
      jobId,
      scheduledDate: parsedScheduledDate,
      interviewerEmail: String(interviewerEmail || '').trim(),
      questions: Array.isArray(questions) ? questions : [],
      interviewType: interviewType || 'Technical Interview',
      durationMinutes: Number(durationMinutes) || 30,
    });
    let savedInterview = await interview.save();
    savedInterview = await Interview.findById(savedInterview._id).populate('candidateId', 'name email skills status').populate('jobId', 'title');

    // Trigger email notification
    const inviteEmail = candidateEmail || candidate.email;
    if (inviteEmail) {
      try {
        const jobTitle = job.title || job.jobTitle || 'the position';

        await sendInterviewInvite(inviteEmail, {
          jobTitle: jobTitle,
          dateTime: scheduledDate,
        });
      } catch (emailErr) {
        console.warn('Email notification warning:', emailErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully!',
      data: savedInterview,
    });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    return res.status(error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500).json({ success: false, message: error.message || 'Could not schedule interview.' });
  }
};

router.post('/', handleSchedule);
router.post('/schedule-interview', handleSchedule);

module.exports = router;
