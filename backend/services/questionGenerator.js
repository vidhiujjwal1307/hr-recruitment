const { callLLM } = require('../utils/llmClient');

/**
 * Generates tailored interview questions based on candidate resume and job details.
 */
async function generateInterviewQuestions(candidateData, jobDetails) {
  const prompt = `Generate 5 technical and behavioral interview questions for candidate ${candidateData.name} applying for position ${jobDetails.title}. Candidate skills: ${candidateData.skills?.join(', ')}.`;
  
  try {
    const response = await callLLM(prompt);
    if (response) return response;
  } catch (err) {
    console.warn('LLM question generation fallback:', err.message);
  }

  return [
    "Tell us about your most challenging software development project.",
    "How do you ensure code quality and handle code reviews?",
    "Describe your experience with the technology stack required for this role.",
    "How do you handle tight deadlines or shifting requirements?",
    "Where do you see your technical leadership skills evolving?"
  ];
}

module.exports = { generateInterviewQuestions };
