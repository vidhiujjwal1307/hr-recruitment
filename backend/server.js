const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables from .env
dotenv.config();

// Connect to MongoDB database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import Routes
const resumeRoutes = require('./routes/resume');
const jobRoutes = require('./routes/jobs');
const matchRoutes = require('./routes/match');
const questionRoutes = require('./routes/questions');
const scheduleRoutes = require('./routes/schedule');
const authRoutes = require('./routes/auth');
const { requireAuth } = require('./middleware/auth');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', requireAuth, resumeRoutes);
app.use('/api/jobs', requireAuth, jobRoutes);
app.use('/api/match', requireAuth, matchRoutes);
app.use('/api/questions', requireAuth, questionRoutes);
app.use('/api/schedule', requireAuth, scheduleRoutes);

// Direct alias mounts to ensure strict exact path compatibility
app.use('/api/upload-resume', requireAuth, resumeRoutes);
app.use('/api/generate-questions', requireAuth, questionRoutes);
app.use('/api/schedule-interview', requireAuth, scheduleRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
