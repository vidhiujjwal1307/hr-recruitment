const { callLLM } = require('../utils/llmClient');

/**
 * Matches candidate against job requirements and description, returning score & AI explanation.
 */
async function matchCandidateToJob(candidate, job) {
  if (!candidate || !job) {
    return {
      matchScore: 50,
      summary: 'Insufficient data available to compute detailed match score.',
      reasons: ['Candidate profile or job details missing.'],
    };
  }

  const candidateSkills = (candidate.skills || []).map((s) => s.toLowerCase());
  const jobReqs = (job.requirements || []).map((r) => r.toLowerCase());

  // Find skill overlap
  const matchedSkills = jobReqs.filter((req) =>
    candidateSkills.some((skill) => skill.includes(req) || req.includes(skill))
  );

  let calculatedScore = jobReqs.length > 0
    ? Math.round((matchedSkills.length / jobReqs.length) * 100)
    : 75;

  if (calculatedScore < 45 && candidateSkills.length > 0) calculatedScore = 60;
  if (calculatedScore > 98) calculatedScore = 98;

  const prompt = `You are an AI recruitment expert evaluating candidate fit.
Candidate: ${candidate.name}
Skills: ${candidate.skills?.join(', ') || 'None specified'}
Experience: ${JSON.stringify(candidate.experience || [])}

Job Title: ${job.title}
Requirements: ${job.requirements?.join(', ') || 'None specified'}
Description: ${job.description || ''}

Return a valid JSON object with:
"matchScore": number between 0 and 100,
"summary": "1 sentence executive summary of match quality",
"reasons": ["Point 1 explaining match/gap", "Point 2 explaining experience alignment", "Point 3 recommendation"]`;

  try {
    const llmResponse = await callLLM(prompt);
    if (llmResponse) {
      let cleaned = llmResponse.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?\n?/, '').replace(/```$/, '').trim();
      }
      const parsed = JSON.parse(cleaned);
      return {
        matchScore: parsed.matchScore || calculatedScore,
        summary: parsed.summary || `Strong skills alignment in ${matchedSkills.join(', ') || 'core requirements'}.`,
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [
          `Matched skills: ${matchedSkills.join(', ') || 'General domain experience'}`,
          `Candidate brings ${candidateSkills.length} total key skills.`
        ],
      };
    }
  } catch (error) {
    console.warn('Matcher LLM fallback:', error.message);
  }

  return {
    matchScore: calculatedScore,
    summary: `Candidate matches ${matchedSkills.length} out of ${jobReqs.length || 1} explicit skill requirements.`,
    reasons: [
      matchedSkills.length > 0 ? `Directly matches: ${matchedSkills.join(', ')}` : 'Limited direct keyword overlap.',
      `Candidate profile contains ${candidateSkills.length} verified technical skills.`,
      `Evaluated for target role: ${job.title}.`
    ],
  };
}

module.exports = { matchCandidateToJob };
