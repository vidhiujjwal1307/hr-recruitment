import React, { useState, useEffect } from 'react';
import { getAnalyticsData } from '../api/client';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsData();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError('Failed to load analytics metrics.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error connecting to analytics service.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Applied': return '#3b82f6';
      case 'Screened': return '#a855f7';
      case 'Interview': return '#f59e0b';
      case 'Offered': return '#10b981';
      case 'Rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Recruitment Analytics Dashboard</h1>
          <p className="page-subtitle">Real-time candidate pipeline stats, skill metrics, and requisition breakdown.</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚡</div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">Recruitment Analytics Dashboard</h1>
          <p className="page-subtitle">Real-time candidate pipeline stats, skill metrics, and requisition breakdown.</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: '#f87171' }}>
          <p style={{ marginBottom: '1rem' }}>⚠️ {error || 'No analytics data available.'}</p>
          <button onClick={fetchAnalytics} className="btn-primary">Retry Loading</button>
        </div>
      </div>
    );
  }

  const { totalCandidates, totalJobs, totalVideoInterviews, pipelineBreakdown, topSkills, recentCandidates } = data;
  const totalInPipeline = Object.values(pipelineBreakdown).reduce((a, b) => a + b, 0) || 1;

  const pipelineStages = [
    { key: 'Applied', label: 'Applied', color: '#3b82f6', icon: '📥' },
    { key: 'Screened', label: 'Screened', color: '#a855f7', icon: '🔍' },
    { key: 'Interview', label: 'Interview Scheduled', color: '#f59e0b', icon: '🎙️' },
    { key: 'Offered', label: 'Job Offered', color: '#10b981', icon: '🎉' },
    { key: 'Rejected', label: 'Rejected', color: '#ef4444', icon: '🚫' },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">📊 Recruitment Analytics & Insights</h1>
          <p className="page-subtitle">Overall candidate funnel breakdown, top skills analysis, and active pipeline metrics.</p>
        </div>
        <button
          onClick={fetchAnalytics}
          style={{
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#818cf8',
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          🔄 Refresh Metrics
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
          <div style={{ fontSize: '0.825rem', color: '#818cf8', fontWeight: 600, textTransform: 'uppercase' }}>Total Candidates</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#fff', margin: '0.4rem 0' }}>{totalCandidates}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Across all job requisitions</div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.02) 100%)', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
          <div style={{ fontSize: '0.825rem', color: '#c084fc', fontWeight: 600, textTransform: 'uppercase' }}>Active Job Postings</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#fff', margin: '0.4rem 0' }}>{totalJobs}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Open hiring positions</div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <div style={{ fontSize: '0.825rem', color: '#34d399', fontWeight: 600, textTransform: 'uppercase' }}>Video Interviews</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#fff', margin: '0.4rem 0' }}>{totalVideoInterviews}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Asynchronous video links created</div>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
          <div style={{ fontSize: '0.825rem', color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase' }}>Offers / Interviews</div>
          <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#fff', margin: '0.4rem 0' }}>
            {(pipelineBreakdown.Interview || 0) + (pipelineBreakdown.Offered || 0)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>High intent candidates</div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Candidate Pipeline Stage Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '1.25rem' }}>
            🔲 Candidate Pipeline Status Funnel
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {pipelineStages.map((stage) => {
              const count = pipelineBreakdown[stage.key] || 0;
              const pct = Math.round((count / totalInPipeline) * 100);

              return (
                <div key={stage.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 600, color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{stage.icon}</span> {stage.label}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      <strong>{count}</strong> ({pct}%)
                    </span>
                  </div>
                  <div style={{
                    height: '10px',
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.06)',
                    borderRadius: '5px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: stage.color,
                      borderRadius: '5px',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Candidate Skills Breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '1.25rem' }}>
            💡 Top Resume Skills Extracted
          </h3>
          {topSkills.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No skills extracted yet.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {topSkills.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.875rem',
                    color: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{s.skill}</span>
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '0.1rem 0.45rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    {s.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>
          📑 Recent Candidate Registrations
        </h3>
        {recentCandidates.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No candidate applications registered yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Candidate Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Pipeline Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Skills Extracted</th>
                </tr>
              </thead>
              <tbody>
                {recentCandidates.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff' }}>{c.name}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>{c.email}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        background: `${getStatusColor(c.status)}22`,
                        color: getStatusColor(c.status),
                        border: `1px solid ${getStatusColor(c.status)}44`,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        fontSize: '0.775rem',
                        fontWeight: 600,
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                      {c.skillsCount} skills
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
