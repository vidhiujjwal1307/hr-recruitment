import React, { useState } from 'react';
import { createVideoInterviewRequest, updateCandidateStatus, deleteCandidate } from '../api/client';
import VideoInterviewResults from './VideoInterviewResults';

export default function CandidateCard({
  candidate,
  selectedJobId,
  matchData,
  onAnalyzeMatch,
  onGenerateQuestions,
  onOpenSchedule,
  onOpenQA,
  onStatusUpdated,
  onCandidateDeleted,
}) {
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [showQuestions, setShowQuestions] = useState(false);

  // Video interview accordion toggle
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [videoQuestion, setVideoQuestion] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [videoNotice, setVideoNotice] = useState('');
  const [videoError, setVideoError] = useState('');
  const [creatingVideoRequest, setCreatingVideoRequest] = useState(false);
  const [videoRefreshKey, setVideoRefreshKey] = useState(0);

  const [currentStatus, setCurrentStatus] = useState(candidate.status || 'Applied');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pipelineStages = ['Applied', 'Screened', 'Interview', 'Offered', 'Rejected'];

  const getStatusStyle = (st) => {
    switch (st) {
      case 'Applied': return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.4)', color: '#60a5fa' };
      case 'Screened': return { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.4)', color: '#c084fc' };
      case 'Interview': return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' };
      case 'Offered': return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', color: '#34d399' };
      case 'Rejected': return { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', color: '#f87171' };
      default: return { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.4)', color: '#9ca3af' };
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setCurrentStatus(newStatus);
    setUpdatingStatus(true);
    const candidateId = candidate._id || candidate.id;
    try {
      await updateCandidateStatus(candidateId, newStatus);
      if (onStatusUpdated) {
        onStatusUpdated(candidateId, newStatus);
      }
    } catch (err) {
      console.error('Failed to update candidate status:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    const candidateId = candidate._id || candidate.id;
    if (!window.confirm(`Are you sure you want to permanently delete candidate ${candidate.name} from the database?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteCandidate(candidateId);
      if (onCandidateDeleted) {
        onCandidateDeleted(candidateId);
      }
    } catch (err) {
      console.error('Failed to delete candidate:', err);
      alert(err.response?.data?.message || 'Failed to delete candidate.');
      setDeleting(false);
    }
  };

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
    setCreatingVideoRequest(true); setVideoError(''); setVideoNotice('');
    try {
      const result = await createVideoInterviewRequest({ candidateId, jobId, question: videoQuestion });
      setVideoLink(`${window.location.origin}${result.data.sharePath}`);
      setVideoNotice(result.data.emailSent ? `Invitation emailed to ${candidate.email}.` : 'Link created! Share with candidate.');
      setVideoQuestion(''); setVideoRefreshKey((key) => key + 1);
    } catch (error) {
      setVideoError(error.response?.data?.message || 'Unable to create video interview request.');
    } finally { setCreatingVideoRequest(false); }
  };

  const statusStyle = getStatusStyle(currentStatus);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', position: 'relative', opacity: deleting ? 0.5 : 1 }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#fff', margin: 0 }}>{candidate.name}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.1rem', margin: 0 }}>{candidate.email}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {currentMatch && currentMatch.matchScore !== undefined && (
            <div style={{
              background: currentMatch.matchScore >= 75 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${currentMatch.matchScore >= 75 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              color: currentMatch.matchScore >= 75 ? '#34d399' : '#fbbf24',
              borderRadius: '20px',
              padding: '0.2rem 0.6rem',
              fontSize: '0.775rem',
              fontWeight: 700,
            }}>
              ⚡ {currentMatch.matchScore}% Match
            </div>
          )}

          {/* Interactive Pipeline Status Badge Select */}
          <select
            value={currentStatus}
            onChange={handleStatusChange}
            disabled={updatingStatus}
            style={{
              background: statusStyle.bg,
              border: `1px solid ${statusStyle.border}`,
              color: statusStyle.color,
              borderRadius: '20px',
              padding: '0.2rem 0.65rem',
              fontSize: '0.775rem',
              fontWeight: 700,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {pipelineStages.map((st) => (
              <option key={st} value={st} style={{ background: '#121824', color: '#fff' }}>
                🔲 {st}
              </option>
            ))}
          </select>

          {/* Delete Candidate Button */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Delete candidate from database"
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              borderRadius: '8px',
              padding: '0.25rem 0.5rem',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Skills */}
      <div>
        <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Key Skills
        </h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {candidate.skills && candidate.skills.length > 0 ? (
            candidate.skills.map((skill, idx) => (
              <span
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.15rem 0.45rem',
                  fontSize: '0.775rem',
                  color: '#e5e7eb',
                }}
              >
                {skill}
              </span>
            ))
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No skills extracted</span>
          )}
        </div>
      </div>

      {/* AI Explanation Accordion */}
      {showExplanation && currentMatch && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          borderRadius: '8px',
          padding: '0.75rem',
          fontSize: '0.85rem',
        }}>
          <div style={{ fontWeight: 600, color: '#818cf8', marginBottom: '0.3rem' }}>
            💡 AI Match Analysis Summary
          </div>
          <p style={{ marginBottom: '0.4rem', color: '#e5e7eb' }}>{currentMatch.summary}</p>
          {currentMatch.reasons && currentMatch.reasons.length > 0 && (
            <ul style={{ paddingLeft: '1.1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
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
          padding: '0.75rem',
        }}>
          <div style={{ fontWeight: 600, color: '#c084fc', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
            ❓ Tailored Interview Questions
          </div>
          {loadingQuestions ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generating questions with AI...</p>
          ) : questions && questions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {questions.map((q, idx) => (
                <div key={idx} style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  borderLeft: '3px solid #a855f7',
                  fontSize: '0.8rem',
                  color: '#f3f4f6',
                }}>
                  {idx + 1}. {q}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No questions generated yet.</p>
          )}
        </div>
      )}

      {/* Primary Action Buttons Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem', marginTop: '0.2rem' }}>
        <button
          onClick={handleAnalyzeClick}
          disabled={loadingMatch}
          style={{
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#818cf8',
            padding: '0.45rem 0.6rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.775rem',
            cursor: 'pointer',
          }}
        >
          {loadingMatch ? 'Analyzing...' : '⚡ Match Score'}
        </button>

        <button
          onClick={handleGenerateQuestionsClick}
          disabled={loadingQuestions}
          style={{
            background: 'rgba(168, 85, 247, 0.12)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            color: '#c084fc',
            padding: '0.45rem 0.6rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.775rem',
            cursor: 'pointer',
          }}
        >
          ❓ Questions
        </button>

        <button
          onClick={() => onOpenQA(candidate)}
          style={{
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#60a5fa',
            padding: '0.45rem 0.6rem',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.775rem',
            cursor: 'pointer',
          }}
        >
          💬 Resume Q&A
        </button>

        <button
          onClick={() => onOpenSchedule(candidate, questions)}
          className="btn-primary"
          style={{ fontSize: '0.775rem', padding: '0.45rem 0.6rem' }}
        >
          📅 Schedule
        </button>
      </div>

      {/* Expandable Video Screening & Link Accordion */}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: '0.3rem' }}>
        <button
          onClick={() => setShowVideoOptions(!showVideoOptions)}
          style={{
            width: '100%',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#6ee7b7',
            padding: '0.45rem 0.6rem',
            borderRadius: '6px',
            fontSize: '0.775rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>📹 Video Interview & Screening</span>
          <span>{showVideoOptions ? '▲' : '▼'}</span>
        </button>

        {showVideoOptions && (
          <div style={{ marginTop: '0.6rem', background: 'rgba(0, 0, 0, 0.2)', padding: '0.75rem', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '0.4rem', color: '#a5b4fc', fontSize: '0.8rem', margin: 0 }}>Request Video Answer:</h4>
            <textarea
              value={videoQuestion}
              onChange={(event) => setVideoQuestion(event.target.value)}
              placeholder="Enter interview question for candidate..."
              rows={2}
              style={{
                width: '100%',
                padding: '0.45rem',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                border: '1px solid var(--border-color)',
                resize: 'vertical',
                fontSize: '0.8rem',
                marginTop: '0.3rem',
              }}
            />
            {videoError && <p style={{ color: '#f87171', fontSize: '0.775rem', marginTop: '0.3rem', margin: 0 }}>{videoError}</p>}
            {videoNotice && <p style={{ color: videoNotice.startsWith('Invitation') ? '#86efac' : '#fbbf24', fontSize: '0.775rem', marginTop: '0.3rem', margin: 0 }}>{videoNotice}</p>}
            <button
              onClick={createVideoRequest}
              disabled={creatingVideoRequest}
              style={{
                marginTop: '0.4rem',
                padding: '0.4rem 0.6rem',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#6ee7b7',
                fontSize: '0.775rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {creatingVideoRequest ? 'Creating…' : 'Create shareable video link'}
            </button>
            {videoLink && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', wordBreak: 'break-all', color: '#bfdbfe' }}>
                Link: <a href={videoLink} target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>{videoLink}</a>
              </div>
            )}

            <VideoInterviewResults candidateId={candidate._id || candidate.id} refreshKey={videoRefreshKey} />
          </div>
        )}
      </div>
    </div>
  );
}
