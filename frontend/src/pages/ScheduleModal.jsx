import React, { useState } from 'react';
import { scheduleInterview } from '../api/client';

export default function ScheduleModal({ candidate, jobId, questions, onClose }) {
  const [candidateEmail, setCandidateEmail] = useState(candidate.email || '');
  const [interviewerEmail, setInterviewerEmail] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!scheduledDate) {
      setError('Please select a date and time.');
      return;
    }
    if (!interviewerEmail || !interviewerEmail.trim()) {
      setError('Please enter interviewer email.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        candidateId: candidate._id || candidate.id,
        jobId: jobId || 'job_demo_1',
        scheduledDate,
        interviewerEmail: interviewerEmail.trim(),
        candidateEmail: candidateEmail.trim(),
        questions: questions || [],
      };

      const res = await scheduleInterview(payload);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setError(res.message || 'Failed to schedule interview.');
      }
    } catch (err) {
      console.error('Schedule error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to schedule interview.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', margin: '1rem', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>📅 Schedule Candidate Interview</h2>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '0.75rem',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#34d399' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>✅</div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>Interview Scheduled!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Confirmation sent to {candidateEmail} & {interviewerEmail}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Candidate Name</p>
              <p style={{ fontWeight: 600, color: '#fff' }}>{candidate.name}</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Candidate Email
              </label>
              <input
                type="email"
                required
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  color: '#fff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Interviewer Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                required
                value={interviewerEmail}
                onChange={(e) => setInterviewerEmail(e.target.value)}
                placeholder="interviewer@company.com"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  color: '#fff'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Interview Date & Time <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  color: '#fff'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
