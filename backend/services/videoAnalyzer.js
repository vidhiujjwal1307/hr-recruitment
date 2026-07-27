const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { callLLM } = require('../utils/llmClient');

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

function extractAudio(videoFilePath) {
  const audioFilePath = `${videoFilePath}.mp3`;
  return new Promise((resolve, reject) => {
    ffmpeg(videoFilePath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('128k')
      .on('end', () => resolve(audioFilePath))
      .on('error', reject)
      .save(audioFilePath);
  });
}

function parseAnalysis(rawResponse) {
  const fallback = {
    summary: 'The response was transcribed, but the automated screening summary could not be generated.',
    relevanceScore: null,
    confidenceScore: null,
    speakingSkillsScore: null,
    overallScore: null,
    strengths: [],
    areasToImprove: [],
    followUpQuestions: [],
  };
  if (!rawResponse) {
    console.error('Video screening analysis is empty; no scores were saved.');
    return fallback;
  }

  try {
    const cleanJson = String(rawResponse).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);
    const readScore = (fieldName) => {
      const value = Number(parsed[fieldName]);
      if (!Number.isFinite(value)) {
        console.error(`Video screening analysis is missing a valid ${fieldName}; leaving it unset.`);
        return null;
      }
      return Math.min(100, Math.max(0, value));
    };
    return {
      summary: String(parsed.summary || fallback.summary),
      relevanceScore: readScore('relevanceScore'),
      confidenceScore: readScore('confidenceScore'),
      speakingSkillsScore: readScore('speakingSkillsScore'),
      overallScore: readScore('overallScore'),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).slice(0, 5) : [],
      areasToImprove: Array.isArray(parsed.areasToImprove) ? parsed.areasToImprove.map(String).slice(0, 5) : [],
      followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions.map(String).slice(0, 3) : [],
    };
  } catch (error) {
    console.error('Could not parse Groq video screening response; no scores were saved:', error.message, { rawResponse: String(rawResponse).slice(0, 500) });
    return fallback;
  }
}

async function transcribeAudio(audioFilePath) {
  if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured.');
  const form = new FormData();
  form.append('file', fs.createReadStream(audioFilePath));
  form.append('model', 'whisper-large-v3');
  const response = await axios.post('https://api.groq.com/openai/v1/audio/transcriptions', form, {
    headers: { ...form.getHeaders(), Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });
  if (!response.data?.text) throw new Error('Groq did not return a transcription.');
  return response.data.text;
}

async function analyzeVideoInterview(videoFilePath, jobDescription, question) {
  let audioFilePath;
  try {
    audioFilePath = await extractAudio(videoFilePath);
    const transcript = await transcribeAudio(audioFilePath);
    const llmResponse = await callLLM(
      `You are screening a candidate's video interview response for a job.

Job Description: ${jobDescription}
Interview Question Asked: ${question}
Candidate's Transcribed Response: ${transcript}

Assess ONLY the candidate's words, phrasing, and structure — do not speculate about their appearance, facial expressions, or personality.

Return ONLY valid JSON with this structure:
{
  "summary": "3-4 sentence summary covering what the candidate said, how confident they sounded based on their word choice, and how clear their speaking was",
  "relevanceScore": <0-100, how relevant/correct the content was for the question and job>,
  "confidenceScore": <0-100, based on use of assertive vs hedging language, directness of answers, and decisiveness of phrasing>,
  "speakingSkillsScore": <0-100, based on clarity, structure, concrete examples, filler word frequency, and overall articulateness>,
  "overallScore": <0-100, weighted combination of relevance, confidence, and speaking skills>,
  "strengths": ["short phrase", "short phrase"],
  "areasToImprove": ["short phrase", "short phrase"],
  "followUpQuestions": ["question 1", "question 2", "question 3"]
}

Every judgment must be grounded in the actual transcribed words — no assumptions about tone of voice, appearance, or emotional state.`,
      'You are a fair, transcript-only interview screening assistant. Return only valid JSON.'
    );
    return { transcript, ...parseAnalysis(llmResponse) };
  } finally {
    // Audio is temporary. The original video is retained for recruiters at videoPath.
    if (audioFilePath) fs.promises.unlink(audioFilePath).catch(() => {});
  }
}

module.exports = { analyzeVideoInterview, extractAudio, parseAnalysis };
