import { useCallback, useEffect, useState } from 'react';
import { getCandidateVideoInterviews } from '../api/client';

const scoreText = (score) => Number.isFinite(Number(score)) ? `${Math.round(Number(score))}/100` : 'Not available';

function ScoreCard({ label, score, prominent = false }) {
  return <div style={{ flex: 1, minWidth: 120, padding: prominent ? '1rem' : '.7rem', textAlign: 'center', borderRadius: '8px', background: prominent ? 'rgba(99,102,241,.16)' : 'rgba(255,255,255,.05)', border: prominent ? '1px solid rgba(129,140,248,.5)' : '1px solid var(--border-color)' }}>
    <div style={{ color: prominent ? '#c7d2fe' : 'var(--text-muted)', fontWeight: 600, fontSize: prominent ? '.9rem' : '.8rem' }}>{label}</div>
    <div style={{ color: prominent ? '#fff' : '#d1d5db', fontWeight: 800, fontSize: prominent ? '1.8rem' : '1.1rem', lineHeight: 1.3 }}>{scoreText(score)}</div>
  </div>;
}

export default function VideoInterviewResults({ candidateId, refreshKey }) {
  const [interviews, setInterviews] = useState([]);
  const [expanded, setExpanded] = useState({});
  const loadInterviews = useCallback(() => {
    getCandidateVideoInterviews(candidateId).then((result) => setInterviews(result.data || [])).catch(() => setInterviews([]));
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
  return <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
    <h4 style={{ color: '#a5b4fc', marginBottom: '.75rem' }}>Video interview screening</h4>
    {interviews.map((interview) => <div key={interview._id} style={{ background: 'rgba(0,0,0,.2)', borderRadius: '8px', padding: '.9rem', marginTop: '.5rem' }}>
      <strong>{interview.status === 'completed' ? 'Completed' : interview.status}</strong>
      {interview.status === 'failed' && <p style={{ color: '#f87171' }}>{interview.errorMessage}</p>}
      {interview.status === 'completed' && <>
        <div style={{ marginTop: '.75rem' }}><ScoreCard label="Overall Score" score={interview.overallScore} /></div>
        <div style={{ display: 'flex', gap: '.65rem', marginTop: '.65rem' }}><ScoreCard label="Confidence Score" score={interview.confidenceScore} prominent /><ScoreCard label="Speaking Skills Score" score={interview.speakingSkillsScore} prominent /></div>
        <div style={{ marginTop: '.65rem' }}><ScoreCard label="Relevance Score" score={interview.relevanceScore} /></div>
        <p style={{ marginTop: '.9rem', color: 'var(--text-muted)' }}>{interview.summary}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.75rem', marginTop: '.75rem' }}>
          <div><strong style={{ color: '#86efac' }}>Strengths</strong><ul style={{ paddingLeft: '1.25rem', marginTop: '.3rem' }}>{interview.strengths?.length ? interview.strengths.map((item, index) => <li key={index}>{item}</li>) : <li>Not available</li>}</ul></div>
          <div><strong style={{ color: '#fbbf24' }}>Areas to Improve</strong><ul style={{ paddingLeft: '1.25rem', marginTop: '.3rem' }}>{interview.areasToImprove?.length ? interview.areasToImprove.map((item, index) => <li key={index}>{item}</li>) : <li>Not available</li>}</ul></div>
        </div>
        <div style={{ marginTop: '.75rem' }}><strong style={{ color: '#c4b5fd' }}>Suggested follow-up questions</strong>{interview.followUpQuestions?.length > 0 && <ul style={{ paddingLeft: '1.25rem', marginTop: '.3rem', color: '#ddd' }}>{interview.followUpQuestions.map((question, index) => <li key={index}>{question}</li>)}</ul>}</div>
        <button onClick={() => setExpanded((current) => ({ ...current, [interview._id]: !current[interview._id] }))} style={{ color: '#a5b4fc', background: 'transparent', padding: 0, marginTop: '.75rem' }}>{expanded[interview._id] ? 'Hide transcript' : 'Show transcript'}</button>
        {expanded[interview._id] && <p style={{ whiteSpace: 'pre-wrap', marginTop: '.5rem', color: 'var(--text-muted)' }}>{interview.transcript}</p>}
      </>}
    </div>)}
  </section>;
}
