const mongoose = require('mongoose');

const CandidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    education: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    rawText: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Applied', 'Screened', 'Interview', 'Offered', 'Rejected'],
      default: 'Applied',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Candidate', CandidateSchema);
