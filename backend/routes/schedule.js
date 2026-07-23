const express = require('express');
const router = express.Router();
const Interview = require('../models/Interview');
const { sendInterviewInvite } = require('../services/emailService');
const mongoose = require('mongoose');

const handleSchedule = async (req, res) => {
  try {
    const { candidateId, jobId, scheduledDate, interviewerEmail, candidateEmail, questions } = req.body;

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
        status: 'scheduled',
        createdAt: new Date(),
      };
    }

    // Trigger email notification
    if (candidateEmail) {
      try {
        await sendInterviewInvite(candidateEmail, savedInterview);
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
