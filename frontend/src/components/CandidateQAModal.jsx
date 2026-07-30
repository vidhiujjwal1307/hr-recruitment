import React, { useState } from 'react';
import { askCandidateQA } from '../api/client';

export default function CandidateQAModal({ candidate, onClose }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello! Ask me any question about **${candidate.name}**'s resume and qualifications.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [error, setError] = useState('');

  const starterPrompts = [
    'What are their top technical skills?',
    'Summarize their work experience',
    'What backend frameworks do they know best?',
    'Has this candidate led teams or projects?',
    'What is their educational background?',
  ];

  const handleAsk = async (promptToUse) => {
    const qText = promptToUse || question;
    if (!qText.trim()) return;

    const candidateId = candidate._id || candidate.id;
    const userMsg = {
      sender: 'user',
      text: qText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!promptToUse) setQuestion('');
    setLoading(true);
    setError('');

    try {
      const res = await askCandidateQA(candidateId, qText);
      if (res.success && res.data) {
        const aiMsg = {
          sender: 'ai',
          text: res.data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setError(res.message || 'Failed to retrieve answer from resume.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error executing candidate Q&A.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem',
    }}>
      <div style={{
        background: '#121824',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.25rem' }}>💬</span>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
                RAG Candidate Q&A — {candidate.name}
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.2rem', margin: 0 }}>
              Answers generated using candidate resume raw text & AI context model.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0.25rem',
            }}
          >
            &times;
          </button>
        </div>

        {/* Quick starter prompts */}
        <div style={{
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(99, 102, 241, 0.03)',
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, display: 'flex', alignItems: 'center', marginRight: '0.25rem' }}>
            💡 Quick:
          </span>
          {starterPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(prompt)}
              disabled={loading}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                color: '#d1d5db',
                padding: '0.3rem 0.75rem',
                fontSize: '0.775rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Log */}
        <div style={{
          flex: 1,
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          minHeight: '260px',
        }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '0.85rem 1.1rem',
                borderRadius: '12px',
                background: msg.sender === 'user' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(255, 255, 255, 0.05)',
                border: msg.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                color: '#fff',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
              }}>
                {msg.text}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', padding: '0 0.25rem' }}>
                {msg.timestamp}
              </span>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#c084fc', fontSize: '0.875rem' }}>
              <span style={{ animation: 'spin 1s linear infinite' }}>⚡</span> Searching candidate resume with AI...
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
            }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          gap: '0.75rem',
        }}>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask a question about ${candidate.name}'s experience, education, or skills...`}
            rows={2}
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: '#fff',
              padding: '0.75rem',
              fontSize: '0.9rem',
              resize: 'none',
              outline: 'none',
            }}
          />
          <button
            onClick={() => handleAsk()}
            disabled={loading || !question.trim()}
            className="btn-primary"
            style={{
              alignSelf: 'center',
              padding: '0.75rem 1.25rem',
              fontSize: '0.9rem',
              opacity: loading || !question.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Asking...' : 'Ask AI'}
          </button>
        </div>
      </div>
    </div>
  );
}
