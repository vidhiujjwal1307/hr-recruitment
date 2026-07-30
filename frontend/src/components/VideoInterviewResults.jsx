import { useCallback, useEffect, useState } from 'react';
import { getCandidateVideoInterviews } from '../api/client';

const scoreText = (score) => (Number.isFinite(Number(score)) ? `${Math.round(Number(score))}/100` : 'N/A');

function ScoreCard({ label, score, prominent = false }) {
  return (
    <div style={{
      flex: '1 1 110px',
      padding: '0.6rem 0.75rem',
      textAlign: 'center',
      borderRadius: '8px',
      background: prominent ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
      border: prominent ? '1px solid rgba(129, 140, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
    }}>
      <div style={{ color: prominent ? '#c7d2fe' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>{label}</div>
      <div style={{ color: prominent ? '#fff' : '#d1d5db', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.2rem' }}>{scoreText(score)}</div>
    </div>
  );
}

export default function VideoInterviewResults({ candidateId, refreshKey }) {
  const [interviews, setInterviews] = useState([]);
  const [expanded, setExpanded] = useState({});

  const loadInterviews = useCallback(() => {
    getCandidateVideoInterviews(candidateId)
      .then((result) => setInterviews(result.data || []))
      .catch(() => setInterviews([]));
  }, [candidateId]);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews, refreshKey]);

  useEffect(() => {
    if (!interviews.some((interview) => ['pending', 'processing'].includes(interview.status))) return undefined;
    const interval = setInterval(loadInterviews, 3000);
    return () => clearInterval(interval);
  }, [interviews, loadInterviews]);

  if (!interviews.length) return null;

  return (
    <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', marginTop: '0.5rem' }}>
      <h4 style={{ color: '#a5b4fc', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>
        🎥 Video Screening Results
      </h4>
      {interviews.map((interview) => (
        <div key={interview._id} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem', fontSize: '0.825rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, color: interview.status === 'completed' ? '#34d399' : '#fbbf24' }}>
              Status: {interview.status === 'completed' ? 'Completed' : interview.status}
            </span>
          </div>

          {interview.status === 'failed' && <p style={{ color: '#f87171', marginTop: '0.4rem' }}>{interview.errorMessage}</p>}

          {interview.status === 'completed' && (
            <>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                <ScoreCard label="Overall" score={interview.overallScore} prominent />
                <ScoreCard label="Confidence" score={interview.confidenceScore} />
                <ScoreCard label="Speaking" score={interview.speakingSkillsScore} />
                <ScoreCard label="Relevance" score={interview.relevanceScore} />
              </div>

              {interview.summary && (
                <p style={{ marginTop: '0.6rem', color: '#e5e7eb', fontSize: '0.8rem', lineHeight: 1.4 }}>
                  {interview.summary}
                </p>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', marginTop: '0.6rem' }}>
                {interview.strengths?.length > 0 && (
                  <div>
                    <strong style={{ color: '#86efac', fontSize: '0.775rem' }}>Strengths:</strong>
                    <ul style={{ paddingLeft: '1rem', marginTop: '0.2rem', margin: 0, color: '#d1d5db', fontSize: '0.775rem' }}>
                      {interview.strengths.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {interview.areasToImprove?.length > 0 && (
                  <div>
                    <strong style={{ color: '#fbbf24', fontSize: '0.775rem' }}>Areas to Improve:</strong>
                    <ul style={{ paddingLeft: '1rem', marginTop: '0.2rem', margin: 0, color: '#d1d5db', fontSize: '0.775rem' }}>
                      {interview.areasToImprove.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <button
                onClick={() => setExpanded((curr) => ({ ...curr, [interview._id]: !curr[interview._id] }))}
                style={{ color: '#a5b4fc', background: 'transparent', border: 'none', padding: 0, marginTop: '0.6rem', fontSize: '0.775rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                {expanded[interview._id] ? 'Hide Transcript' : 'Show Full Transcript'}
              </button>
              {expanded[interview._id] && (
                <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.4rem', color: '#9ca3af', fontSize: '0.775rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px' }}>
                  {interview.transcript}
                </p>
              )}
            </>
          )}
        </div>
      ))}
    </section>
  );
}
