import React, { useState, useEffect } from 'react';
import { getCandidates, getJobs, matchCandidate, generateQuestions, deleteCandidate } from '../api/client';
import CandidateCard from '../components/CandidateCard';
import ScheduleModal from './ScheduleModal';
import CandidateQAModal from '../components/CandidateQAModal';

export default function MatchResultsPage() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matchDataMap, setMatchDataMap] = useState({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingBatchMatch, setLoadingBatchMatch] = useState(false);
  const [activeScheduleModal, setActiveScheduleModal] = useState(null);
  const [activeQAModalCandidate, setActiveQAModalCandidate] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState('ALL');
  const [minMatchScore, setMinMatchScore] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'pipeline'

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [candRes, jobRes] = await Promise.all([getCandidates(), getJobs()]);
      const fetchedCandidates = candRes.data || [];
      const fetchedJobs = jobRes.data || [];
      setCandidates(fetchedCandidates);
      setJobs(fetchedJobs);

      if (fetchedJobs.length > 0) {
        setSelectedJobId(fetchedJobs[0]._id || fetchedJobs[0].id);
        runMatchesForJob(fetchedJobs[0]._id || fetchedJobs[0].id, fetchedCandidates);
      }
    } catch (err) {
      console.error('Failed to load candidate or job data:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const runMatchesForJob = async (jobId, candidateList = candidates) => {
    if (!jobId || candidateList.length === 0) return;
    setLoadingBatchMatch(true);

    const newMap = { ...matchDataMap };
    try {
      await Promise.all(
        candidateList.map(async (cand) => {
          const cId = cand._id || cand.id;
          try {
            const matchRes = await matchCandidate(cId, jobId);
            if (matchRes.success) {
              newMap[cId] = matchRes.data;
            }
          } catch (mErr) {
            console.error(`Match error for candidate ${cId}:`, mErr);
          }
        })
      );
      setMatchDataMap(newMap);
    } finally {
      setLoadingBatchMatch(false);
    }
  };

  const handleJobSelectChange = (e) => {
    const newJobId = e.target.value;
    setSelectedJobId(newJobId);
    if (newJobId) {
      runMatchesForJob(newJobId, candidates);
    }
  };

  const handleAnalyzeMatch = async (candidate, jobId) => {
    const cId = candidate._id || candidate.id;
    const res = await matchCandidate(cId, jobId);
    if (res.success) {
      setMatchDataMap((prev) => ({
        ...prev,
        [cId]: res.data,
      }));
    }
  };

  const handleGenerateQuestions = async (candidate, jobId) => {
    const cId = candidate._id || candidate.id;
    const targetJobId = jobId || selectedJobId;
    const res = await generateQuestions(cId, targetJobId);
    return res.data?.questions || [];
  };

  const handleStatusUpdated = (candidateId, newStatus) => {
    setCandidates((prev) =>
      prev.map((c) => ((c._id || c.id) === candidateId ? { ...c, status: newStatus } : c))
    );
  };

  const handleCandidateDeleted = (candidateId) => {
    setCandidates((prev) => prev.filter((c) => (c._id || c.id) !== candidateId));
  };

  const handleDeleteKanbanCandidate = async (candidateId, name) => {
    if (!window.confirm(`Delete candidate ${name} permanently from database?`)) return;
    try {
      await deleteCandidate(candidateId);
      handleCandidateDeleted(candidateId);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete candidate.');
    }
  };

  // Collect all unique skills for filter dropdown
  const allSkillsSet = new Set();
  candidates.forEach((c) => {
    if (Array.isArray(c.skills)) {
      c.skills.forEach((s) => allSkillsSet.add(s));
    }
  });
  const allSkillsList = Array.from(allSkillsSet).sort();

  // Apply Search & Filters
  const filteredCandidates = candidates.filter((cand) => {
    const cId = cand._id || cand.id;
    const matchScore = matchDataMap[cId]?.matchScore || 0;

    // Search query filter (name, email, skills)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = cand.name?.toLowerCase().includes(q);
      const emailMatch = cand.email?.toLowerCase().includes(q);
      const skillMatch = cand.skills?.some((s) => s.toLowerCase().includes(q));
      if (!nameMatch && !emailMatch && !skillMatch) return false;
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      const candStatus = cand.status || 'Applied';
      if (candStatus !== statusFilter) return false;
    }

    // Skill filter
    if (selectedSkillFilter !== 'ALL') {
      if (!cand.skills?.includes(selectedSkillFilter)) return false;
    }

    // Score filter
    if (minMatchScore > 0 && matchScore < minMatchScore) {
      return false;
    }

    return true;
  });

  // Sort candidates by match score descending
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    const scoreA = matchDataMap[a._id || a.id]?.matchScore || 0;
    const scoreB = matchDataMap[b._id || b.id]?.matchScore || 0;
    return scoreB - scoreA;
  });

  const pipelineStages = ['Applied', 'Screened', 'Interview', 'Offered', 'Rejected'];
  const selectedJob = jobs.find((j) => (j._id || j.id) === selectedJobId);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">AI Candidate Matching & Pipeline Pool</h1>
        <p className="page-subtitle">Rank candidate applications, filter by skills & status, and run RAG resume Q&A.</p>
      </div>

      {/* Target Job Selector Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
          🎯 Target Job Requisition for Candidate Ranking:
        </label>
        <select
          value={selectedJobId}
          onChange={handleJobSelectChange}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid var(--border-color)',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 500,
          }}
        >
          <option value="">-- Choose a Job Posting --</option>
          {jobs.map((job) => (
            <option key={job._id || job.id} value={job._id || job.id}>
              {job.title} ({job.location})
            </option>
          ))}
        </select>

        {selectedJob && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            <strong>Selected Job Requirements:</strong> {selectedJob.requirements?.join(', ') || 'General qualifications'}
          </div>
        )}
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', margin: 0 }}>
            🔍 Search & Filter Candidates
          </h3>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                background: viewMode === 'grid' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                border: viewMode === 'grid' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                color: viewMode === 'grid' ? '#818cf8' : '#9ca3af',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📱 Cards Grid
            </button>

            <button
              onClick={() => setViewMode('pipeline')}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                background: viewMode === 'pipeline' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255,255,255,0.05)',
                border: viewMode === 'pipeline' ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid transparent',
                color: viewMode === 'pipeline' ? '#c084fc' : '#9ca3af',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔲 Pipeline Kanban Board
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Keyword Search Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
              Search Name / Skill / Keyword:
            </label>
            <input
              type="text"
              placeholder="e.g. Alex, React, Node..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.875rem',
              }}
            />
          </div>

          {/* Pipeline Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
              Pipeline Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.875rem',
              }}
            >
              <option value="ALL">All Statuses ({candidates.length})</option>
              {pipelineStages.map((st) => (
                <option key={st} value={st}>
                  {st} ({candidates.filter((c) => (c.status || 'Applied') === st).length})
                </option>
              ))}
            </select>
          </div>

          {/* Skill Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
              Filter by Skill:
            </label>
            <select
              value={selectedSkillFilter}
              onChange={(e) => setSelectedSkillFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.875rem',
              }}
            >
              <option value="ALL">All Extracted Skills</option>
              {allSkillsList.map((skill) => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
          </div>

          {/* Match Score Threshold Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
              Minimum AI Match Score: {minMatchScore}%
            </label>
            <select
              value={minMatchScore}
              onChange={(e) => setMinMatchScore(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: '6px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                color: '#fff',
                fontSize: '0.875rem',
              }}
            >
              <option value={0}>Any Match Score</option>
              <option value={50}>≥ 50% Match</option>
              <option value={70}>≥ 70% Match</option>
              <option value={80}>≥ 80% Match (Top Fit)</option>
              <option value={90}>≥ 90% Match (Elite Fit)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Results View */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            Candidate Pool ({sortedCandidates.length} of {candidates.length})
          </h2>
          {loadingBatchMatch && (
            <span style={{ fontSize: '0.85rem', color: '#818cf8' }}>⚡ Calculating AI match scores...</span>
          )}
        </div>

        {loadingInitial ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading candidate pool...
          </div>
        ) : sortedCandidates.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No candidates matched the selected search or filter criteria. Try adjusting your filters or upload new resumes.
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {sortedCandidates.map((candidate) => (
              <CandidateCard
                key={candidate._id || candidate.id}
                candidate={candidate}
                selectedJobId={selectedJobId}
                matchData={matchDataMap}
                onAnalyzeMatch={handleAnalyzeMatch}
                onGenerateQuestions={handleGenerateQuestions}
                onOpenSchedule={(cand, qList) => setActiveScheduleModal({ candidate: cand, questions: qList })}
                onOpenQA={(cand) => setActiveQAModalCandidate(cand)}
                onStatusUpdated={handleStatusUpdated}
                onCandidateDeleted={handleCandidateDeleted}
              />
            ))}
          </div>
        ) : (
          /* Kanban / Pipeline View */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '1rem',
            overflowX: 'auto',
            paddingBottom: '1rem',
          }}>
            {pipelineStages.map((stage) => {
              const stageCandidates = sortedCandidates.filter(
                (c) => (c.status || 'Applied') === stage
              );

              return (
                <div
                  key={stage}
                  style={{
                    background: 'rgba(18, 24, 36, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1rem',
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '0.5rem',
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                      {stage}
                    </span>
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#a5b4fc',
                      borderRadius: '10px',
                      padding: '0.1rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}>
                      {stageCandidates.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    {stageCandidates.map((cand) => {
                      const cId = cand._id || cand.id;
                      const score = matchDataMap[cId]?.matchScore;

                      return (
                        <div
                          key={cId}
                          style={{
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            padding: '0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                              {cand.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {score !== undefined && (
                                <span style={{ fontSize: '0.75rem', color: score >= 75 ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                                  {score}%
                                </span>
                              )}
                              <button
                                onClick={() => handleDeleteKanbanCandidate(cId, cand.name)}
                                title="Delete Candidate"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#f87171',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  padding: 0,
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {cand.skills?.slice(0, 3).join(', ') || 'No skills listed'}
                          </div>

                          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                            <button
                              onClick={() => setActiveQAModalCandidate(cand)}
                              style={{
                                flex: 1,
                                padding: '0.3rem',
                                borderRadius: '4px',
                                background: 'rgba(59, 130, 246, 0.15)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                color: '#60a5fa',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              💬 Q&A
                            </button>
                            <button
                              onClick={() => setActiveScheduleModal({ candidate: cand, questions: [] })}
                              style={{
                                flex: 1,
                                padding: '0.3rem',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: '#818cf8',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              📅 Schedule
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {activeScheduleModal && (
        <ScheduleModal
          candidate={activeScheduleModal.candidate}
          jobId={selectedJobId}
          questions={activeScheduleModal.questions}
          onClose={() => setActiveScheduleModal(null)}
        />
      )}

      {/* Candidate Q&A RAG Modal */}
      {activeQAModalCandidate && (
        <CandidateQAModal
          candidate={activeQAModalCandidate}
          onClose={() => setActiveQAModalCandidate(null)}
        />
      )}
    </div>
  );
}
