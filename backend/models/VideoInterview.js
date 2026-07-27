const mongoose = require('mongoose');

const videoInterviewSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  question: { type: String, required: true, trim: true },
  videoPath: { type: String, default: '' },
  transcript: { type: String, default: '' },
  summary: { type: String, default: '' },
  relevanceScore: { type: Number, min: 0, max: 100 },
  confidenceScore: { type: Number, min: 0, max: 100 },
  speakingSkillsScore: { type: Number, min: 0, max: 100 },
  overallScore: { type: Number, min: 0, max: 100 },
  strengths: { type: [String], default: [] },
  areasToImprove: { type: [String], default: [] },
  followUpQuestions: { type: [String], default: [] },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  accessToken: { type: String, required: true, unique: true, index: true },
  errorMessage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('VideoInterview', videoInterviewSchema);
