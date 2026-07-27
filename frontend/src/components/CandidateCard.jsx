import React, { useState } from 'react';
import { createVideoInterviewRequest } from '../api/client';
import VideoInterviewResults from './VideoInterviewResults';

export default function CandidateCard({
  candidate,
  selectedJobId,
  matchData,
  onAnalyzeMatch,
  onGenerateQuestions,
  onOpenSchedule,
}) {
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [videoQuestion, setVideoQuestion] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [videoNotice, setVideoNotice] = useState('');
  const [videoError, setVideoError] = useState('');
  const [creatingVideoRequest, setCreatingVideoRequest] = useState(false);
  const [videoRefreshKey, setVideoRefreshKey] = useState(0);

  const handleAnalyzeClick = async () => {
    if (!selectedJobId) {
      alert('Please select a Job Posting from the dropdown first.');
      return;
    }
    setLoadingMatch(true);
    setShowExplanation(true);
    try {
      await onAnalyzeMatch(candidate, selectedJobId);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMatch(false);
    }
  };

  const handleGenerateQuestionsClick = async () => {
    setLoadingQuestions(true);
    setShowQuestions(true);
    try {
      const qList = await onGenerateQuestions(candidate, selectedJobId);
      setQuestions(qList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const currentMatch = matchData?.[candidate._id || candidate.id];

  const createVideoRequest = async () => {
    if (!selectedJobId) return setVideoError('Select a job posting before creating a video interview.');
    if (!videoQuestion.trim()) return setVideoError('Enter the interview question first.');
    const candidateId = candidate._id?.toString?.() || candidate._id || candidate.id;
    const jobId = selectedJobId?.toString?.() || selectedJobId;
    console.log('Creating video interview request with IDs:', { candidateId, jobId });
    setCreatingVideoRequest(true); setVideoError(''); setVideoNotice('');
    try {
      const result = await createVideoInterviewRequest({ candidateId, jobId, question: videoQuestion });
      setVideoLink(`${window.location.origin}${result.data.sharePath}`);
      setVideoNotice(result.data.emailSent ? `Invitation emailed to ${candidate.email}.` : 'Link created, but the email could not be sent. Copy the link manually or check SMTP settings.');
      setVideoQuestion(''); setVideoRefreshKey((key) => key + 1);
    } catch (error) {
      setVideoError(error.response?.data?.message || 'Unable to create video interview request.');
    } finally { setCreatingVideoRequest(false); }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>{candidate.name}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{candidate.email}</p>
        </div>

        {currentMatch && currentMatch.matchScore !== undefined ? (
          <div style={{
            background: currentMatch.matchScore >= 75 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            border: `1px solid ${currentMatch.matchScore >= 75 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
            color: currentMatch.matchScore >= 75 ? '#34d399' : '#fbbf24',
            borderRadius: '20px',
            padding: '0.3rem 0.8rem',
            fontSize: '0.85rem',
            fontWeight: 700
          }}>
            ⚡ {currentMatch.matchScore}% Match
          </div>
        ) : (
          <span style={{
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#818cf8',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '20px',
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            Parsed Candidate
          </span>
        )}
      </div>

      <div>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Key Skills
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {candidate.skills && candidate.skills.length > 0 ? (
            candidate.skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.8rem',
                  color: '#e5e7eb'
                }}
              >
                {skill}
              </span>
            ))
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No skills extracted</span>
          )}
        </div>
      </div>

      {/* AI Explanation Accordion */}
      {showExplanation && currentMatch && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '8px',
          padding: '0.85rem',
          fontSize: '0.875rem'
        }}>
          <div style={{ fontWeight: 600, color: '#818cf8', marginBottom: '0.4rem' }}>
            💡 AI Match Analysis Summary
          </div>
          <p style={{ marginBottom: '0.5rem', color: '#e5e7eb' }}>{currentMatch.summary}</p>
          {currentMatch.reasons && currentMatch.reasons.length > 0 && (
            <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-muted)', fontSize: '0.825rem' }}>
              {currentMatch.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* AI Questions Accordion */}
      {showQuestions && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: '8px',
          padding: '0.85rem'
        }}>
          <div style={{ fontWeight: 600, color: '#c084fc', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            ❓ Tailored Interview Questions
          </div>
          {loadingQuestions ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generating questions with AI...</p>
          ) : questions && questions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {questions.map((q, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  borderLeft: '3px solid #a855f7',
                  fontSize: '0.85rem',
                  color: '#f3f4f6'
                }}>
                  {idx + 1}. {q}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No questions generated yet.</p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        <button
          onClick={handleAnalyzeClick}
          disabled={loadingMatch}
          style={{
            flex: '1 1 45%',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#818cf8',
            padding: '0.55rem 0.75rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          {loadingMatch ? 'Analyzing...' : '⚡ Analyze AI Match'}
        </button>

        <button
          onClick={handleGenerateQuestionsClick}
          disabled={loadingQuestions}
          style={{
            flex: '1 1 45%',
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            color: '#c084fc',
            padding: '0.55rem 0.75rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          ❓ Generate Questions
        </button>

        <button
          onClick={() => onOpenSchedule(candidate, questions)}
          className="btn-primary"
          style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem' }}
        >
          📅 Schedule Interview
        </button>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
        <h4 style={{ marginBottom: '.5rem', color: '#a5b4fc' }}>Request video interview</h4>
        <textarea value={videoQuestion} onChange={(event) => setVideoQuestion(event.target.value)} placeholder="Enter one interview question for this candidate" rows={3} style={{ width: '100%', padding: '.6rem', borderRadius: '8px', background: 'rgba(255,255,255,.04)', color: '#fff', border: '1px solid var(--border-color)', resize: 'vertical' }} />
        {videoError && <p style={{ color: '#f87171', fontSize: '.8rem', marginTop: '.4rem' }}>{videoError}</p>}
        {videoNotice && <p style={{ color: videoNotice.startsWith('Invitation') ? '#86efac' : '#fbbf24', fontSize: '.8rem', marginTop: '.4rem' }}>{videoNotice}</p>}
        <button onClick={createVideoRequest} disabled={creatingVideoRequest} style={{ marginTop: '.5rem', padding: '.55rem .75rem', borderRadius: '8px', background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.35)', color: '#6ee7b7' }}>{creatingVideoRequest ? 'Creating…' : 'Create shareable video link'}</button>
        {videoLink && <div style={{ marginTop: '.75rem', fontSize: '.8rem', wordBreak: 'break-all', color: '#bfdbfe' }}>Candidate link: <a href={videoLink} target="_blank" rel="noreferrer">{videoLink}</a></div>}
      </div>
      <VideoInterviewResults candidateId={candidate._id || candidate.id} refreshKey={videoRefreshKey} />
    </div>
  );
}
