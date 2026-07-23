function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const pdfParse = require('pdf-parse');
const { callLLM } = require('../utils/llmClient');

/**
 * Extracts skills from raw text as fallback if LLM is unconfigured or returns empty skills.
 */
function extractFallbackSkills(rawText) {
  if (!rawText) return [];

  const foundSkills = new Set();
  const knownKeywords = [
    'JavaScript', 'TypeScript', 'Node.js', 'React', 'React.js', 'Express', 'Express.js',
    'Vue', 'Vue.js', 'Angular', 'Python', 'Java', 'C++', 'C#', 'SQL', 'MongoDB', 'PostgreSQL',
    'MySQL', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'HTML', 'CSS', 'Sass',
    'Git', 'GitHub', 'REST API', 'RESTful APIs', 'GraphQL', 'Tailwind', 'TailwindCSS',
    'Machine Learning', 'Deep Learning', 'LLM', 'ChromaDB', 'Numpy', 'Pandas', 'PyTorch',
    'TensorFlow', 'Agile', 'Scrum', 'CI/CD'
  ];

  for (const kw of knownKeywords) {
    const regex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
    if (regex.test(rawText)) {
      foundSkills.add(kw);
    }
  }

  // Look for "Skills:" or "Technical Skills:" sections in text
  const skillsSectionRegex = /(?:skills|technical skills|core competencies|technologies)\s*[:\-\n]+([^\n\r]+(?:\n[^\n\r]+){0,3})/i;
  const match = rawText.match(skillsSectionRegex);
  if (match && match[1]) {
    const sectionText = match[1];
    const items = sectionText.split(/[,•|;\/\n]+/).map((s) => s.trim()).filter((s) => s.length > 1 && s.length < 30);
    items.forEach((item) => foundSkills.add(item));
  }

  return Array.from(foundSkills);
}

/**
 * Extracts raw text from PDF buffer and uses LLM to parse into structured candidate JSON.
 * @param {Buffer} fileBuffer - PDF file buffer
 * @returns {Promise<Object>} - Parsed candidate object
 */
async function parseResume(fileBuffer) {
  // 1. Extract raw text using pdf-parse
  const pdfData = await pdfParse(fileBuffer);
  const rawText = pdfData.text || '';

  console.log('\n=================== [STEP 1: RAW EXTRACTED PDF TEXT] ===================');
  console.log(rawText);
  console.log('========================================================================\n');

  // Default candidate structure
  let parsedCandidate = {
    name: 'Unknown Candidate',
    email: 'candidate@example.com',
    skills: [],
    experience: [],
    education: [],
    rawText: rawText,
  };

  // Attempt basic regex extraction for email & name fallback
  const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    parsedCandidate.email = emailMatch[0];
  }

  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length > 0 && lines[0].length < 50) {
    parsedCandidate.name = lines[0];
  }

  // 2. Structured Prompt for LLM
  const prompt = `Extract the following fields from this resume text and return ONLY valid JSON, no markdown formatting, no extra commentary:
{
  "name": "string",
  "email": "string",
  "skills": ["individual skill names, split from any comma-separated or bullet-pointed list"],
  "experience": [
    { "company": "string", "role": "string", "duration": "string" }
  ],
  "education": [
    { "institution": "string", "degree": "string", "year": "string" }
  ]
}

If a field cannot be found, return an empty array or empty string for it, never omit the key.

Resume text:
${rawText}`;

  try {
    const rawLlmResponse = await callLLM(prompt);

    console.log('\n=================== [STEP 2: RAW LLM RESPONSE] ===================');
    console.log(rawLlmResponse ? rawLlmResponse : '(NO RESPONSE / LLM UNCONFIGURED)');
    console.log('==================================================================\n');

    if (rawLlmResponse) {
      // 4. Strip markdown code fences (```json ... ```)
      let cleanedJsonStr = rawLlmResponse.trim();
      cleanedJsonStr = cleanedJsonStr
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

      // 5. JSON Parsing with error logging
      try {
        const llmResult = JSON.parse(cleanedJsonStr);
        console.log('[ResumeParser] Successfully parsed LLM JSON output.');

        parsedCandidate = {
          name: llmResult.name || parsedCandidate.name,
          email: llmResult.email || parsedCandidate.email,
          skills: Array.isArray(llmResult.skills) && llmResult.skills.length > 0
            ? llmResult.skills
            : extractFallbackSkills(rawText),
          experience: Array.isArray(llmResult.experience) ? llmResult.experience : [],
          education: Array.isArray(llmResult.education) ? llmResult.education : [],
          rawText: rawText,
        };
      } catch (parseError) {
        console.error('\n=================== [JSON PARSE FAILURE] ===================');
        console.error('Error message:', parseError.message);
        console.error('Raw string attempting to parse:\n', cleanedJsonStr);
        console.error('============================================================\n');
        parsedCandidate.skills = extractFallbackSkills(rawText);
      }
    } else {
      console.log('[ResumeParser] LLM client unconfigured or unavailable. Using fallback extraction.');
      parsedCandidate.skills = extractFallbackSkills(rawText);
    }
  } catch (error) {
    console.error('[ResumeParser] LLM invocation error:', error.message);
    parsedCandidate.skills = extractFallbackSkills(rawText);
  }

  // Ensure skills array is populated if empty
  if (!parsedCandidate.skills || parsedCandidate.skills.length === 0) {
    parsedCandidate.skills = extractFallbackSkills(rawText);
  }

  console.log('\n=================== [STEP 3: FINAL PARSED CANDIDATE OBJECT] ===================');
  console.log(JSON.stringify(parsedCandidate, null, 2));
  console.log('===============================================================================\n');

  return parsedCandidate;
}

module.exports = { parseResume, extractFallbackSkills };
