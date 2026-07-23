const axios = require('axios');

/**
 * Sends prompt to LLM (Google Gemini REST API or OpenAI-compatible endpoint)
 * and returns the generated text / JSON string.
 */
async function callLLM(prompt, systemInstruction = '') {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'your_llm_api_key_here') {
    console.warn('GEMINI_API_KEY / LLM_API_KEY not configured. Returning fallback structured data.');
    return null;
  }

  try {
    // Attempt calling Gemini API v1beta
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              {
                text: `${systemInstruction ? systemInstruction + '\n\n' : ''}${prompt}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const candidates = response.data?.candidates;
    if (candidates && candidates.length > 0) {
      const text = candidates[0].content?.parts[0]?.text;
      return text;
    }

    throw new Error('No candidates returned from Gemini API.');
  } catch (error) {
    console.error('LLM API Error:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { callLLM };
