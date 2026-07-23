import React, { useState } from 'react';
import { uploadResume } from '../api/client';

export default function UploadResumePage({ onCandidateUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await uploadResume(formData);
      setResult(response.data);
      if (onCandidateUploaded) {
        onCandidateUploaded(response.data);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to upload and parse resume PDF.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Upload Resume</h1>
        <p className="page-subtitle">Extract candidate data instantly using LLM-powered PDF parsing.</p>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            border: '2px dashed rgba(99, 102, 241, 0.4)',
            borderRadius: '12px',
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            background: 'rgba(99, 102, 241, 0.03)',
            cursor: 'pointer'
          }}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              id="resume-input"
              style={{ display: 'none' }}
            />
            <label htmlFor="resume-input" style={{ cursor: 'pointer' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
              <p style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                {file ? file.name : 'Click to select or drag a PDF resume here'}
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Supports PDF format up to 10MB
              </p>
            </label>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Parsing Resume with AI...' : 'Parse & Save Candidate'}
          </button>
        </form>

        {result && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '1rem', fontWeight: 600 }}>
              ✓ Resume Parsed & Saved
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '8px' }}>
              <p><strong>Name:</strong> {result.name}</p>
              <p><strong>Email:</strong> {result.email}</p>
              <p><strong>Skills:</strong> {result.skills?.join(', ') || 'None extracted'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
