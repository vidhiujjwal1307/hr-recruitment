const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const Job = require('../models/Job');
const { sendInterviewInvite } = require('../services/emailService');
const mongoose = require('mongoose');
const store = require('../db/store');

router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const interviews = await Interview.find().sort({ scheduledDate: 1 }).populate('candidateId', 'name email skills status').populate('jobId', 'title');
      return res.json({ success: true, count: interviews.length, data: interviews });
    }
    const interviews = (store.interviews || []).map((interview) => ({
      ...interview,
      candidateId: store.candidates.find((candidate) => String(candidate._id || candidate.id) === String(interview.candidateId)) || null,
      jobId: store.jobs.find((job) => String(job._id || job.id) === String(interview.jobId)) || null,
    })).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    return res.json({ success: true, count: interviews.length, data: interviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Could not load interviews.' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid interview status.' });
    }
    let interview;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(req.params.id)) {
      interview = await Interview.findByIdAndUpdate(req.params.id, { status }, { new: true }).populate('candidateId', 'name email skills status').populate('jobId', 'title');
    } else {
      const existing = (store.interviews || []).find((item) => String(item._id) === String(req.params.id));
      if (existing) { existing.status = status; interview = { ...existing }; }
    }
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    return res.json({ success: true, data: interview });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Could not update interview.' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { scheduledDate, interviewerEmail } = req.body;
    if (!scheduledDate || !interviewerEmail?.trim()) {
      return res.status(400).json({ success: false, message: 'A new date, time, and interviewer email are required.' });
    }
    let interview;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(req.params.id)) {
      interview = await Interview.findByIdAndUpdate(req.params.id, { scheduledDate, interviewerEmail: interviewerEmail.trim() }, { new: true, runValidators: true }).populate('candidateId', 'name email skills status').populate('jobId', 'title');
    } else {
      const existing = (store.interviews || []).find((item) => String(item._id) === String(req.params.id));
      if (existing) { existing.scheduledDate = scheduledDate; existing.interviewerEmail = interviewerEmail.trim(); interview = { ...existing }; }
    }
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found.' });
    const candidate = interview.candidateId?.email ? interview.candidateId : store.candidates.find((item) => String(item._id || item.id) === String(interview.candidateId));
    const job = interview.jobId?.title ? interview.jobId : store.jobs.find((item) => String(item._id || item.id) === String(interview.jobId));
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

    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: 'Scheduled date and time are required.' });
    }
    if (!interviewerEmail || !interviewerEmail.trim()) {
      return res.status(400).json({ success: false, message: 'Interviewer email is required.' });
    }

    let savedInterview;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(candidateId) && mongoose.Types.ObjectId.isValid(jobId)) {
      const interview = new Interview({
        candidateId,
        jobId,
        scheduledDate,
        interviewerEmail: interviewerEmail.trim(),
        questions: questions || [],
        interviewType: interviewType || 'Live Video Interview',
        durationMinutes: Number(durationMinutes) || 30,
      });
      savedInterview = await interview.save();
    } else {
      savedInterview = {
        _id: 'int_' + Date.now(),
        candidateId: candidateId || 'cand_demo_1',
        jobId: jobId || 'job_demo_1',
        scheduledDate,
        interviewerEmail: interviewerEmail.trim(),
        candidateEmail: candidateEmail || 'candidate@example.com',
        questions: questions || [],
        interviewType: interviewType || 'Live Video Interview',
        durationMinutes: Number(durationMinutes) || 30,
        status: 'scheduled',
        createdAt: new Date(),
      };
      store.interviews ||= [];
      store.interviews.unshift(savedInterview);
    }

    // Trigger email notification
    if (candidateEmail) {
      try {
        let jobTitle = 'the position';

        if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(jobId)) {
          const job = await Job.findById(jobId);
          if (job) {
            jobTitle = job.title || job.jobTitle || jobTitle;
          }
        }

        await sendInterviewInvite(candidateEmail, {
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
    return res.status(500).json({ success: false, message: error.message });
  }
};

router.post('/', handleSchedule);
router.post('/schedule-interview', handleSchedule);

module.exports = router;
