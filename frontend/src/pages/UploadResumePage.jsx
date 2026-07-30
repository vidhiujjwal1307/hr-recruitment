import React, { useState } from 'react';
import { uploadResume, uploadBulkResumes } from '../api/client';

export default function UploadResumePage({ onCandidateUploaded }) {
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'
  const [file, setFile] = useState(null);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSingleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleBulkFilesChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files).filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (selected.length === 0) {
        setError('Please select valid PDF files.');
        return;
      }
      setBulkFiles(selected);
      setError(null);
    }
  };

  const handleRemoveBulkFile = (index) => {
    setBulkFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSingleSubmit = async (e) => {
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

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (bulkFiles.length === 0) {
      setError('Please select at least one PDF resume file for bulk upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setBulkResults(null);

    const formData = new FormData();
    bulkFiles.forEach((f) => {
      formData.append('resumes', f);
    });

    try {
      const response = await uploadBulkResumes(formData);
      if (response.success && response.data) {
        setBulkResults(response.data);
      } else {
        setError(response.message || 'Bulk upload failed.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to process bulk resume uploads.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Candidate Resume Upload & Parsing</h1>
        <p className="page-subtitle">Extract structured candidate data instantly using LLM-powered PDF parsing.</p>
      </div>

      {/* Mode Switcher */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '0.5rem' }}>
        <button
          onClick={() => { setMode('single'); setError(null); }}
          style={{
            padding: '0.6rem 1.5rem',
            borderRadius: '8px',
            background: mode === 'single' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: mode === 'single' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
            color: mode === 'single' ? '#818cf8' : '#9ca3af',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          📄 Single Resume Upload
        </button>
        <button
          onClick={() => { setMode('bulk'); setError(null); }}
          style={{
            padding: '0.6rem 1.5rem',
            borderRadius: '8px',
            background: mode === 'bulk' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            border: mode === 'bulk' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
            color: mode === 'bulk' ? '#c084fc' : '#9ca3af',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
          }}
        >
          📚 Bulk Resume Upload (Multiple PDFs)
        </button>
      </div>

      <div className="card" style={{ maxWidth: '640px', margin: '0 auto' }}>
        {mode === 'single' ? (
          <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              border: '2px dashed rgba(99, 102, 241, 0.4)',
              borderRadius: '12px',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              background: 'rgba(99, 102, 241, 0.03)',
              cursor: 'pointer',
            }}>
              <input
                type="file"
                accept=".pdf"
                onChange={handleSingleFileChange}
                id="resume-input-single"
                style={{ display: 'none' }}
              />
              <label htmlFor="resume-input-single" style={{ cursor: 'pointer' }}>
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
                fontSize: '0.9rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !file}
              style={{ opacity: loading || !file ? 0.7 : 1 }}
            >
              {loading ? 'Parsing Resume with AI...' : 'Parse & Save Candidate'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              border: '2px dashed rgba(168, 85, 247, 0.4)',
              borderRadius: '12px',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              background: 'rgba(168, 85, 247, 0.03)',
              cursor: 'pointer',
            }}>
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleBulkFilesChange}
                id="resume-input-bulk"
                style={{ display: 'none' }}
              />
              <label htmlFor="resume-input-bulk" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📚</div>
                <p style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                  {bulkFiles.length > 0
                    ? `${bulkFiles.length} PDF resumes selected`
                    : 'Click to select multiple PDF resumes at once'}
                </p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Select up to 15 PDF files simultaneously
                </p>
              </label>
            </div>

            {bulkFiles.length > 0 && (
              <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#c084fc', marginBottom: '0.5rem' }}>
                  Selected Files for Batch Processing ({bulkFiles.length}):
                </div>
                {bulkFiles.map((f, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <span style={{ color: '#e5e7eb' }}>📄 {f.name} ({Math.round(f.size / 1024)} KB)</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBulkFile(idx)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.9rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading || bulkFiles.length === 0}
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                opacity: loading || bulkFiles.length === 0 ? 0.7 : 1,
              }}
            >
              {loading ? 'Batch Parsing Multiple Resumes...' : `Parse & Import ${bulkFiles.length || ''} Candidates`}
            </button>
          </form>
        )}

        {/* Single Result Display */}
        {result && mode === 'single' && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '1rem', fontWeight: 600 }}>
              ✓ Resume Parsed & Saved
            </div>
            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '8px' }}>
              <p><strong>Name:</strong> {result.name}</p>
              <p><strong>Email:</strong> {result.email}</p>
              <p><strong>Status:</strong> {result.status || 'Applied'}</p>
              <p><strong>Skills:</strong> {result.skills?.join(', ') || 'None extracted'}</p>
            </div>
          </div>
        )}

        {/* Bulk Result Summary Display */}
        {bulkResults && mode === 'bulk' && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', marginBottom: '1rem', fontWeight: 600 }}>
              🎉 Bulk Resume Import Completed
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                ✓ {bulkResults.successfulCount} Successfully Parsed
              </div>
              {bulkResults.failedCount > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠️ {bulkResults.failedCount} Failed
                </div>
              )}
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto' }}>
              {bulkResults.results.map((resItem, idx) => (
                <div key={idx} style={{ padding: '0.5rem 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: '#fff' }}>👤 {resItem.candidate?.name || resItem.fileName}</div>
                  <div style={{ color: 'var(--text-muted)' }}>Email: {resItem.candidate?.email}</div>
                  <div style={{ color: '#a5b4fc' }}>Skills: {resItem.candidate?.skills?.slice(0, 5).join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
