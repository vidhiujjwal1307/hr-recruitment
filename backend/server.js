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

// Mount Routes
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/schedule', scheduleRoutes);

// Direct alias mounts to ensure strict exact path compatibility
app.use('/api/upload-resume', resumeRoutes);
app.use('/api/generate-questions', questionRoutes);
app.use('/api/schedule-interview', scheduleRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
