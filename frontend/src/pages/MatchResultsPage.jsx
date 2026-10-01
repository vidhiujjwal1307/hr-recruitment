import React, { useState, useEffect } from 'react';
import { ArrowRight, FileText, Search, UserRound, X } from 'lucide-react';
import { getCandidates, getJobs, matchCandidate, deleteCandidate, updateCandidateStatus } from '../api/client';
import CandidateCard from '../components/CandidateCard';
import CandidateQAModal from '../components/CandidateQAModal';

const candidateStages = ['Applied', 'Screened', 'Interview', 'Offered', 'Rejected'];

function CandidateDetailsDialog({ candidate, match, onClose, onStatusUpdated, onDeleted, onOpenQA }) {
  const [stage, setStage] = useState(candidate.status || 'Applied');
  const [savingStage, setSavingStage] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const id = candidate._id || candidate.id;
  const experience = Array.isArray(candidate.experience) ? candidate.experience : [];
  const updateStage = async (event) => {
    const next = event.target.value;
    setSavingStage(true);
    try { await updateCandidateStatus(id, next); setStage(next); onStatusUpdated(id, next); }
    catch (error) { window.alert(error.response?.data?.message || 'Could not update candidate stage.'); }
    finally { setSavingStage(false); }
  };
  const removeCandidate = async () => {
    if (!window.confirm(`Delete ${candidate.name || 'this candidate'} permanently?`)) return;
    setDeleting(true);
    try { await deleteCandidate(id); onDeleted(id); onClose(); }
    catch (error) { window.alert(error.response?.data?.message || 'Could not delete candidate.'); setDeleting(false); }
  };
  return <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="detail-modal candidate-detail-modal" role="dialog" aria-modal="true" aria-labelledby={`candidate-detail-${id}`}>
    <header className="detail-modal-header"><div><span className="eyebrow">CANDIDATE PROFILE</span><h2 id={`candidate-detail-${id}`}>{candidate.name || 'Unnamed candidate'}</h2><p>{candidate.email || 'No email provided'}</p></div><button className="icon-button" onClick={onClose} aria-label="Close candidate details"><X size={18} /></button></header>
    <div className="candidate-detail-summary"><span className="candidate-avatar">{candidate.name?.slice(0, 1)?.toUpperCase() || <UserRound size={16} />}</span><span className={`status-badge status-${stage.toLowerCase()}`}>{stage === 'Screened' ? 'Screening' : stage}</span><label>Pipeline stage<select value={stage} onChange={updateStage} disabled={savingStage}>{candidateStages.map((item) => <option key={item} value={item}>{item === 'Screened' ? 'Screening' : item}</option>)}</select></label><span className="candidate-detail-score"><strong>{match?.matchScore == null ? '—' : `${match.matchScore}%`}</strong><small>Match score</small></span></div>
    {match?.summary && <section className="candidate-detail-section"><h3>AI screening summary</h3><p>{match.summary}</p></section>}
    <section className="candidate-detail-section"><h3>Skills</h3>{candidate.skills?.length ? <div className="candidate-detail-skills">{candidate.skills.map((skill) => <span key={skill}>{skill}</span>)}</div> : <p>No extracted skills are available.</p>}</section>
    <section className="candidate-detail-section"><h3>Experience</h3>{experience.length ? experience.map((item, index) => <p key={index}><strong>{item.role || item.title || 'Experience'}</strong>{item.company ? ` · ${item.company}` : ''}{item.duration ? ` · ${item.duration}` : ''}{item.description ? <small>{item.description}</small> : null}</p>) : <p>No structured experience was found.</p>}</section>
    <section className="candidate-detail-section"><h3>Resume</h3><pre>{candidate.rawText || 'Resume text is not available.'}</pre></section>
    <footer className="candidate-detail-actions"><button className="candidate-action-button" onClick={() => onOpenQA(candidate)}><FileText size={14} /> Resume Q&amp;A</button><button className="candidate-action-button danger-action" onClick={removeCandidate} disabled={deleting}>{deleting ? 'Removing…' : 'Delete candidate'}</button></footer>
  </section></div>;
}

export default function MatchResultsPage({ initialSearch = '', mode = 'candidates', onMatchScores, onNavigate }) {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matchDataMap, setMatchDataMap] = useState({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [dataError, setDataError] = useState('');
  const [loadingBatchMatch, setLoadingBatchMatch] = useState(false);
  const [activeQAModalCandidate, setActiveQAModalCandidate] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [reviewCandidate, setReviewCandidate] = useState(null);
  const [selectingId, setSelectingId] = useState('');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState('ALL');
  const [minMatchScore, setMinMatchScore] = useState(0);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'pipeline'

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  const loadInitialData = async () => {
    setLoadingInitial(true); setDataError('');
    const [candidateResult, jobResult] = await Promise.allSettled([getCandidates(), getJobs()]);
    const fetchedCandidates = candidateResult.status === 'fulfilled' && Array.isArray(candidateResult.value?.data) ? candidateResult.value.data : [];
    const fetchedJobs = jobResult.status === 'fulfilled' && Array.isArray(jobResult.value?.data) ? jobResult.value.data : [];
    setCandidates(fetchedCandidates); setJobs(fetchedJobs);
    const failures = [];
    if (candidateResult.status === 'rejected') failures.push(candidateResult.reason?.response?.data?.message || 'Candidate data could not be loaded.');
    if (jobResult.status === 'rejected' && mode !== 'candidates') failures.push(jobResult.reason?.response?.data?.message || 'Job data could not be loaded.');
    if (failures.length) setDataError(failures.join(' '));
    if (fetchedJobs.length > 0) {
      setSelectedJobId(fetchedJobs[0]._id || fetchedJobs[0].id);
      if (fetchedCandidates.length) runMatchesForJob(fetchedJobs[0]._id || fetchedJobs[0].id, fetchedCandidates);
    }
    setLoadingInitial(false);
  };

  const runMatchesForJob = async (jobId, candidateList = candidates) => {
    if (!jobId || candidateList.length === 0) return;
    setLoadingBatchMatch(true);

    const newMap = { ...matchDataMap };
    const freshMap = {};
    try {
      await Promise.all(
        candidateList.map(async (cand) => {
          const cId = cand._id || cand.id;
          try {
            const matchRes = await matchCandidate(cId, jobId);
            if (matchRes.success) {
              newMap[cId] = matchRes.data;
              freshMap[cId] = matchRes.data;
            }
          } catch (mErr) {
            console.error(`Match error for candidate ${cId}:`, mErr);
          }
        })
      );
      setMatchDataMap(newMap);
      onMatchScores?.(freshMap, jobId);
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
      onMatchScores?.({ [cId]: res.data }, jobId);
    }
  };

  const handleStatusUpdated = (candidateId, newStatus) => {
    setCandidates((prev) =>
      prev.map((c) => ((c._id || c.id) === candidateId ? { ...c, status: newStatus } : c))
    );
  };

  const handleCandidateDeleted = (candidateId) => {
    setCandidates((prev) => prev.filter((c) => (c._id || c.id) !== candidateId));
  };

  const selectCandidateForInterview = async (candidate) => {
    const id = candidate._id || candidate.id;
    setSelectingId(String(id));
    try {
      await updateCandidateStatus(id, 'Interview');
      handleStatusUpdated(id, 'Interview');
    } catch (error) {
      window.alert(error.response?.data?.message || 'Could not select this candidate for interview.');
    } finally { setSelectingId(''); }
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

  if (mode === 'candidates') {
    const visible = candidates.filter((candidate) => {
      const query = searchQuery.trim().toLowerCase();
      const name = candidate.name || '';
      const email = candidate.email || '';
      const stage = candidate.status || 'Applied';
      return (!query || `${name} ${email}`.toLowerCase().includes(query)) && (statusFilter === 'ALL' || stage === statusFilter);
    });
    const roleForCandidate = (candidate) => {
      const linkedJob = typeof candidate.jobId === 'object' ? candidate.jobId : typeof candidate.job === 'object' ? candidate.job : jobs.find((job) => String(job._id || job.id) === String(candidate.jobId || candidate.job));
      return candidate.appliedFor || candidate.jobTitle || candidate.role || linkedJob?.title || 'Not assigned';
    };
    const closeDetails = () => setSelectedCandidate(null);
    return <div className="candidates-page">
      <header className="page-header candidates-page-header"><div><div className="eyebrow">TALENT OPERATIONS <span /> CANDIDATE PIPELINE</div><h1 className="page-title">Candidates</h1><p className="page-subtitle">Review applicants and keep track of each candidate’s stage.</p></div><span className="candidate-count-pill">{candidates.length} {candidates.length === 1 ? 'candidate' : 'candidates'}</span></header>
      <section className="candidate-list-panel"><div className="candidate-list-toolbar"><label className="candidate-search-field"><Search size={15} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search candidates..." aria-label="Search candidates" /></label><label className="candidate-stage-filter">Pipeline status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All stages</option>{candidateStages.map((stage) => <option key={stage} value={stage}>{stage === 'Screened' ? 'Screening' : stage}</option>)}</select></label></div>
        {loadingInitial ? <div className="panel-loading">Loading candidates…</div> : candidates.length === 0 ? <div className="empty-panel candidate-list-empty"><span className="empty-icon"><UserRound size={18} /></span><strong>{dataError ? 'Candidate data could not be loaded.' : 'No candidates yet.'}</strong><p>{dataError || 'Upload resumes to add candidates to your pipeline.'}</p>{dataError ? <button className="inline-dashboard-action" onClick={loadInitialData}>Retry <ArrowRight size={13} /></button> : <button className="inline-dashboard-action" onClick={() => onNavigate?.('upload')}>Upload Resume <ArrowRight size={13} /></button>}</div> : visible.length === 0 ? <div className="empty-panel compact"><strong>No candidates match these filters.</strong></div> : <div className="table-scroll"><table className="dashboard-table candidates-page-table"><thead><tr><th>Candidate</th><th>Applied for</th><th>Stage</th><th>Match</th><th>Action</th></tr></thead><tbody>{visible.map((candidate) => { const id = candidate._id || candidate.id; const stage = candidate.status || 'Applied'; const score = matchDataMap[id]?.matchScore; const selectedForInterview = stage === 'Interview'; return <tr key={id}><td><button className="candidate-list-open" onClick={() => setSelectedCandidate(candidate)}><span className="candidate-avatar">{candidate.name?.slice(0, 1)?.toUpperCase() || <UserRound size={15} />}</span><span><strong>{candidate.name || 'Unnamed candidate'}</strong><small>{candidate.email || 'No email provided'}</small></span></button></td><td className="table-muted">{roleForCandidate(candidate)}</td><td><span className={`status-badge status-${stage.toLowerCase()}`}>{stage === 'Screened' ? 'Screening' : stage}</span></td><td className="table-match-score">{score == null ? '—' : `${score}%`}</td><td>{selectedForInterview ? <button className="candidate-interview-action selected" onClick={() => onNavigate?.('interviews')}>View Interview <ArrowRight size={12} /></button> : <button className="candidate-interview-action" onClick={() => selectCandidateForInterview(candidate)} disabled={selectingId === String(id)}>{selectingId === String(id) ? 'Selecting…' : 'Select for Interview'}</button>}</td></tr>; })}</tbody></table></div>}
      </section>
      {selectedCandidate && <CandidateDetailsDialog candidate={selectedCandidate} match={matchDataMap[selectedCandidate._id || selectedCandidate.id]} onClose={closeDetails} onStatusUpdated={(id, stage) => { setCandidates((current) => current.map((item) => String(item._id || item.id) === String(id) ? { ...item, status: stage } : item)); setSelectedCandidate((current) => current ? { ...current, status: stage } : current); }} onDeleted={(id) => setCandidates((current) => current.filter((item) => String(item._id || item.id) !== String(id)))} onOpenQA={(candidate) => { closeDetails(); setActiveQAModalCandidate(candidate); }} />}
      {activeQAModalCandidate && <CandidateQAModal candidate={activeQAModalCandidate} onClose={() => setActiveQAModalCandidate(null)} />}
    </div>;
  }

  if (mode === 'assessments') {
    return <div className="screening-page">
      <header className="page-header"><div><div className="eyebrow">TALENT OPERATIONS <span /> CANDIDATE SCREENING</div><h1 className="page-title">AI Screening</h1><p className="page-subtitle">Review candidate matches and AI-powered screening insights.</p></div></header>
      <section className="dashboard-panel screening-target-panel"><div><h2>Target job</h2><p>Select a role to compare candidates against.</p></div><select aria-label="Select target job" value={selectedJobId} onChange={handleJobSelectChange}><option value="">Select a job</option>{jobs.map((job) => <option key={job._id || job.id} value={job._id || job.id}>{job.title}</option>)}</select></section>
      <section className="dashboard-panel screening-list-panel"><div className="screening-list-heading"><div><h2>Candidate screening</h2><p>{selectedJob?.title || 'Select a target job to review candidates.'}</p></div><span>{sortedCandidates.length} candidates</span></div><div className="candidate-list-toolbar"><label className="candidate-search-field"><Search size={15} /><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search candidates..." aria-label="Search screening candidates" /></label></div>
        {loadingInitial ? <div className="panel-loading">Loading candidates…</div> : !candidates.length ? <div className="empty-panel candidate-list-empty"><strong>No candidates yet.</strong><p>Upload resumes to start screening candidates.</p></div> : !selectedJobId ? <div className="empty-panel compact"><strong>Select a target job to view match scores.</strong></div> : sortedCandidates.length === 0 ? <div className="empty-panel compact"><strong>No candidates match this search.</strong></div> : <div className="table-scroll"><table className="dashboard-table screening-table"><thead><tr><th>Candidate</th><th>Role</th><th>Match score</th><th>Stage</th><th>Screening status</th><th>Action</th></tr></thead><tbody>{sortedCandidates.map((candidate) => { const id = candidate._id || candidate.id; const score = matchDataMap[id]?.matchScore; const stage = candidate.status || 'Applied'; return <tr key={id}><td><div className="candidate-cell"><span className="candidate-avatar">{candidate.name?.slice(0, 1)?.toUpperCase() || <UserRound size={15} />}</span><span><strong>{candidate.name || 'Unnamed candidate'}</strong><small>{candidate.email || 'No email provided'}</small></span></div></td><td className="table-muted">{selectedJob?.title || '—'}</td><td className="table-match-score">{score == null ? '—' : `${score}%`}</td><td><span className={`status-badge status-${stage.toLowerCase()}`}>{stage === 'Screened' ? 'Screening' : stage}</span></td><td><span className={`screening-ready${score == null ? ' pending' : ''}`}>{score == null ? loadingBatchMatch ? 'Analyzing' : 'Not assessed' : 'Ready'}</span></td><td><button className="candidate-interview-action" onClick={() => setReviewCandidate(candidate)}>Review</button></td></tr>; })}</tbody></table></div>}
      </section>
      {reviewCandidate && <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewCandidate(null); }}><section className="detail-modal screening-review-modal" role="dialog" aria-modal="true" aria-label={`Review ${reviewCandidate.name || 'candidate'}`}><header className="detail-modal-header"><div><span className="eyebrow">AI SCREENING REVIEW</span><h2>{reviewCandidate.name || 'Candidate'}</h2><p>{selectedJob?.title || 'Target job'}</p></div><button className="icon-button" onClick={() => setReviewCandidate(null)} aria-label="Close screening review"><X size={18} /></button></header><CandidateCard candidate={reviewCandidate} selectedJobId={selectedJobId} selectedJobTitle={selectedJob?.title || ''} selectedJobRequirements={selectedJob?.requirements || []} matchData={matchDataMap} onAnalyzeMatch={handleAnalyzeMatch} onOpenQA={setActiveQAModalCandidate} onStatusUpdated={handleStatusUpdated} onCandidateDeleted={(id) => { handleCandidateDeleted(id); setReviewCandidate(null); }} /></section></div>}
      {activeQAModalCandidate && <CandidateQAModal candidate={activeQAModalCandidate} onClose={() => setActiveQAModalCandidate(null)} />}
    </div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{mode === 'interviews' ? 'Interviews' : 'AI Screening'}</h1>
        <p className="page-subtitle">{mode === 'interviews' ? 'Candidates in the interview stage, with scheduling and video screening tools.' : 'Review candidate matches and AI-powered screening insights.'}</p>
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
          <div className="candidate-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
            {sortedCandidates.map((candidate) => (
              <CandidateCard
                key={candidate._id || candidate.id}
                candidate={candidate}
                selectedJobId={selectedJobId}
                selectedJobTitle={selectedJob?.title || ''}
                selectedJobRequirements={selectedJob?.requirements || []}
                matchData={matchDataMap}
                onAnalyzeMatch={handleAnalyzeMatch}
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
