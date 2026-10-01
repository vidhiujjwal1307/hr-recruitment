const mongoose = require('mongoose');

const InterviewSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    interviewerEmail: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    interviewType: { type: String, default: 'Live Video Interview' },
    durationMinutes: { type: Number, min: 5, max: 240, default: 30 },
    questions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Interview', InterviewSchema);
