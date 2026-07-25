const axios = require('axios');

const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Sends a prompt to Groq's OpenAI-compatible chat completions API and returns
 * the generated text / JSON string.
 */
async function callLLM(prompt, systemInstruction = '') {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    console.warn('GROQ_API_KEY is not configured. Returning fallback structured data.');
    return null;
  }

  try {
    const response = await axios.post(
      GROQ_CHAT_COMPLETIONS_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const text = response.data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('No response content returned from Groq API.');
    }

    return text;
  } catch (error) {
    const status = error.response?.status;
    const responseBody = error.response?.data;
    console.error('Groq LLM request failed:', {
      status: status || 'no response',
      responseBody: responseBody || error.message,
    });
    throw error;
  }
}

module.exports = { callLLM };
