import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, FileText, RefreshCw, Search, Sparkles, Video } from 'lucide-react';
import VideoInterviewResults from '../components/VideoInterviewResults';
import { createVideoInterviewRequest, generateQuestions, getCandidateVideoInterviews, getCandidates, getInterviews, getJobs, matchCandidate, scheduleInterview } from '../api/client';

const tabs = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'pending', label: 'Pending scheduling' },
];

export default function VideoInterviewsPage({ onSessionExpired, onScheduled, embedded = false }) {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [records, setRecords] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [matchScores, setMatchScores] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedResultsId, setExpandedResultsId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasLoadedCandidates, setHasLoadedCandidates] = useState(false);
  const [hasLoadedJobs, setHasLoadedJobs] = useState(false);
  const [hasLoadedInterviews, setHasLoadedInterviews] = useState(false);
  const [hasLoadedVideoRecords, setHasLoadedVideoRecords] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({ type: 'Video Interview', date: '', time: '', duration: '30', interviewerEmail: '', questions: '' });

  const load = async () => {
    setLoading(true); setError('');
    const [candidateResult, jobResult, interviewResult] = await Promise.allSettled([getCandidates(), getJobs(), getInterviews()]);
    for (const [endpoint, result] of [['GET /resume/candidates', candidateResult], ['GET /jobs', jobResult], ['GET /schedule', interviewResult]]) {
      if (result.status === 'rejected') console.error(`Interview workflow request failed: ${endpoint}`, { message: result.reason?.message, code: result.reason?.code, status: result.reason?.response?.status, baseURL: result.reason?.config?.baseURL });
    }
    const isAuthError = (result) => result.status === 'rejected' && [401, 403].includes(result.reason?.response?.status);
    const failureReason = (result) => result.status === 'rejected' ? result.reason?.response?.data?.message || (result.reason?.code === 'ECONNABORTED' ? `Request timed out after ${Math.round((result.reason.config?.timeout || 0) / 1000)} seconds.` : result.reason?.message) : 'The service returned an unexpected response.';
    const candidatesLoaded = candidateResult.status === 'fulfilled' && Array.isArray(candidateResult.value?.data);
    const jobsLoaded = jobResult.status === 'fulfilled' && Array.isArray(jobResult.value?.data);
    const interviewsLoaded = interviewResult.status === 'fulfilled' && Array.isArray(interviewResult.value?.data);
    const nextCandidates = candidatesLoaded ? candidateResult.value.data : [];
    const nextJobs = jobsLoaded ? jobResult.value.data : [];
    const nextInterviews = interviewsLoaded ? interviewResult.value.data : [];
    setCandidates(nextCandidates); setJobs(nextJobs); setInterviews(nextInterviews);
    setHasLoadedCandidates(candidatesLoaded);
    setHasLoadedJobs(jobsLoaded); setHasLoadedInterviews(interviewsLoaded);
    setSelectedJobId((current) => nextJobs.some((job) => String(job._id || job.id) === String(current)) ? current : nextJobs[0]?._id || nextJobs[0]?.id || '');

    let loadMessage = '';
    if ([candidateResult, jobResult, interviewResult].some(isAuthError)) {
      loadMessage = 'Your session has expired. Please sign in again.';
    } else if (!candidatesLoaded && interviewsLoaded) {
      loadMessage = 'Interview data loaded, but candidates could not be retrieved.';
    } else if (candidatesLoaded && !interviewsLoaded) {
      loadMessage = 'Candidates loaded, but interview data could not be retrieved.';
    } else if (!candidatesLoaded && !interviewsLoaded) {
      loadMessage = 'Candidate and interview data could not be retrieved.';
    }
    if (!candidatesLoaded && !isAuthError(candidateResult)) loadMessage += ` Candidate service: ${failureReason(candidateResult)}`;
    if (!interviewsLoaded && !isAuthError(interviewResult)) loadMessage += ` Interview service: ${failureReason(interviewResult)}`;
    if (!jobsLoaded) loadMessage = loadMessage ? `${loadMessage} Job data could not be retrieved.` : 'Candidate and interview data loaded, but job data could not be retrieved.';

    if (candidatesLoaded) {
      const interviewLists = await Promise.allSettled(nextCandidates.map((candidate) => getCandidateVideoInterviews(candidate._id || candidate.id)));
      const rejectedLists = interviewLists.filter((result) => result.status === 'rejected' || !Array.isArray(result.value?.data));
      setHasLoadedVideoRecords(rejectedLists.length === 0);
      if (rejectedLists.some(isAuthError)) loadMessage = 'Your session has expired. Please sign in again.';
      else if (rejectedLists.length) loadMessage = `${loadMessage ? `${loadMessage} ` : ''}Some video interview records could not be retrieved. ${failureReason(rejectedLists[0])}`;
      setRecords(interviewLists.flatMap((result, index) => result.status === 'fulfilled' && Array.isArray(result.value?.data) ? result.value.data.map((item) => ({ ...item, candidate: nextCandidates[index] })) : []));
    } else {
      setRecords([]);
      setHasLoadedVideoRecords(false);
    }
    setError(loadMessage);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectedCandidates = useMemo(() => candidates.filter((candidate) => selectedIds.includes(String(candidate._id || candidate.id))), [candidates, selectedIds]);
  const selectedJob = jobs.find((job) => String(job._id || job.id) === String(selectedJobId));
  const interviewCandidate = (interview) => typeof interview.candidateId === 'object' ? interview.candidateId : interview.candidate;
  const scheduled = interviews.filter((interview) => ['scheduled', 'in_progress'].includes(interview.status));
  const completedInterviews = interviews.filter((interview) => interview.status === 'completed');
  const candidateHasRecord = (candidate) => records.some((record) => String(record.candidateId || record.candidate?._id || record.candidate?.id) === String(candidate._id || candidate.id) && ['pending', 'processing', 'completed'].includes(record.status)) || interviews.some((interview) => String(interviewCandidate(interview)?._id || interviewCandidate(interview)?.id || interview.candidateId) === String(candidate._id || candidate.id) && ['scheduled', 'in_progress', 'completed'].includes(interview.status));
  const pendingCandidates = hasLoadedInterviews && hasLoadedVideoRecords ? candidates.filter((candidate) => candidate.status === 'Interview' && !candidateHasRecord(candidate)) : [];
  const visibleCandidates = activeTab === 'pending' ? pendingCandidates : activeTab === 'completed' ? [...completedInterviews.map(interviewCandidate), ...records.filter((record) => record.status === 'completed').map((record) => record.candidate)] : [...scheduled.map(interviewCandidate), ...records.filter((record) => ['pending', 'processing', 'failed'].includes(record.status)).map((record) => record.candidate)];
  const filteredCandidates = visibleCandidates.filter((candidate, index, list) => list.findIndex((other) => String(other._id || other.id) === String(candidate._id || candidate.id)) === index).filter((candidate) => `${candidate.name || ''} ${candidate.email || ''}`.toLowerCase().includes(query.toLowerCase()));

  const toggleCandidate = async (candidate) => {
    const id = String(candidate._id || candidate.id);
    const isSelected = selectedIds.includes(id);
    setSelectedIds((current) => isSelected ? current.filter((value) => value !== id) : [...current, id]);
    if (!isSelected && selectedJobId && matchScores[id] == null) {
      try {
        const response = await matchCandidate(candidate._id || candidate.id, selectedJobId);
        if (response.success) setMatchScores((current) => ({ ...current, [id]: response.data.matchScore }));
      } catch { /* Candidate selection should remain available if match analysis is unavailable. */ }
    }
  };

  const continueToSetup = () => {
    setError(''); setNotice(''); setForm((current) => ({ ...current, questions: '' })); setSetupOpen(true);
  };

  const scheduleOneCandidate = (candidate) => {
    if (!selectedJobId) { setError('Select a job before scheduling this candidate.'); return; }
    setSelectedIds([String(candidate._id || candidate.id)]);
    setError(''); setNotice(''); setForm((current) => ({ ...current, questions: '' })); setSetupOpen(true);
  };

  const handleGenerateQuestions = async () => {
    if (!selectedCandidates.length || !selectedJobId) { setError('Select a candidate and a job before generating questions.'); return; }
    setGenerating(true); setError('');
    try {
      const responses = await Promise.all(selectedCandidates.map((candidate) => generateQuestions(candidate._id || candidate.id, selectedJobId)));
      const questions = [...new Set(responses.flatMap((response) => response.data?.questions || []).map((question) => String(question).trim()).filter(Boolean))].slice(0, 12);
      if (!questions.length) setError('No questions were returned. You can add questions manually.');
      else setForm((current) => ({ ...current, questions: questions.join('\n') }));
    } catch (questionError) { setError(questionError.response?.data?.message || 'Could not generate questions.'); }
    finally { setGenerating(false); }
  };

  const handleSchedule = async (event) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!selectedCandidates.length || !selectedJobId) { setError('Select a candidate and a job posting.'); return; }
    const parsedDate = form.date && form.time ? new Date(`${form.date}T${form.time}`) : null;
    if (!parsedDate || Number.isNaN(parsedDate.getTime())) { setError('Choose a valid interview date and time.'); return; }
    if (parsedDate.getTime() <= Date.now()) { setError('Choose an interview date and time in the future.'); return; }
    const scheduledDate = parsedDate.toISOString();
    const questions = form.questions.split('\n').map((question) => question.trim()).filter(Boolean);
    if (form.interviewerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.interviewerEmail.trim())) { setError('Enter a valid interviewer email or leave it blank.'); return; }
    if (form.type.toLowerCase().includes('video') && !questions.length) { setError('Add at least one question for the video interview.'); return; }
    setSubmitting(true);
    const completedSchedules = [];
    const newVideoRecords = [];
    let videoWarning = '';
    try {
      for (const candidate of selectedCandidates) {
        const candidateId = candidate._id || candidate.id;
        const scheduleResponse = await scheduleInterview({ candidateId, jobId: selectedJobId, scheduledDate, interviewerEmail: form.interviewerEmail.trim(), candidateEmail: candidate.email, questions, interviewType: form.type, durationMinutes: Number(form.duration) });
        completedSchedules.push({ ...scheduleResponse.data, candidate, job: selectedJob, interviewType: form.type, duration: form.duration });
        if (form.type.toLowerCase().includes('video')) {
          try {
            const videoResponse = await createVideoInterviewRequest({ candidateId, jobId: selectedJobId, question: questions[0] });
            newVideoRecords.push({ id: videoResponse.data?.interviewId, candidateId, candidate, jobId: selectedJobId, job: selectedJob, question: questions[0], status: 'pending', createdAt: new Date().toISOString(), sharePath: videoResponse.data?.sharePath, emailSent: videoResponse.data?.emailSent });
          } catch (videoError) {
            console.error('Interview scheduled, but video link creation failed:', videoError);
            videoWarning = videoError.response?.data?.message || videoError.message || 'The video interview link could not be created.';
          }
        }
      }
      setInterviews((current) => [...completedSchedules, ...current]);
      setRecords((current) => [...newVideoRecords, ...current]);
      setSelectedIds([]); setSetupOpen(false); setActiveTab('upcoming');
      const successMessage = `Interview scheduled successfully.${videoWarning ? ` Video setup needs attention: ${videoWarning}` : ''}`;
      setNotice(successMessage);
      if (onScheduled) onScheduled(successMessage);
    } catch (scheduleError) {
      if (completedSchedules.length) setInterviews((current) => [...completedSchedules, ...current]);
      if (newVideoRecords.length) setRecords((current) => [...newVideoRecords, ...current]);
      if (completedSchedules.length) {
        const savedIds = new Set(completedSchedules.map((item) => String(item.candidate?._id || item.candidate?.id)));
        setSelectedIds((current) => current.filter((id) => !savedIds.has(id)));
        setActiveTab('upcoming');
        const partialSuccessMessage = `Interview scheduled successfully. Another selected candidate could not be scheduled: ${scheduleError.response?.data?.message || scheduleError.message || 'Please try again.'}`;
        setNotice(partialSuccessMessage);
        if (onScheduled) onScheduled(partialSuccessMessage);
      } else {
        console.error('Interview scheduling failed:', scheduleError);
        setError(scheduleError.response?.data?.message || scheduleError.message || 'Could not schedule the interview.');
      }
    } finally { setSubmitting(false); }
  };

  const scoreLabel = (candidate) => matchScores[String(candidate._id || candidate.id)];

  return <div className="video-interviews-page">
    {!embedded && <header className="page-header video-interviews-header"><div><div className="eyebrow">TALENT OPERATIONS <span /> INTERVIEW WORKFLOW</div><h1 className="page-title">Interviews</h1><p className="page-subtitle">Select candidates, prepare interviews and manage your interview pipeline.</p></div><button className="refresh-button" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button></header>}

    {notice && <div className="video-notice"><Check size={15} />{notice}</div>}
    {error && <div className="dashboard-error" role="alert"><span>{error}</span>{error.startsWith('Your session has expired') ? <button onClick={() => onSessionExpired?.()}>Sign in again</button> : <button onClick={load} disabled={loading}>{loading ? 'Retrying…' : 'Retry'}</button>}</div>}

    {!embedded && <section className="video-interview-tabs" aria-label="Video interview stages">{tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => { setActiveTab(tab.id); setSelectedIds([]); }}>{tab.label}<span>{tab.id === 'pending' ? pendingCandidates.length : tab.id === 'completed' ? completedInterviews.length + records.filter((record) => record.status === 'completed').length : scheduled.length + records.filter((record) => ['pending', 'processing', 'failed'].includes(record.status)).length}</span></button>)}</section>}

    <div className="video-interview-toolbar"><label className="candidate-list-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates..." /></label><label className="video-job-select">Position<select value={selectedJobId} onChange={(event) => { setSelectedJobId(event.target.value); setMatchScores({}); }}><option value="">Select a job</option>{jobs.map((job) => <option key={job._id || job.id} value={job._id || job.id}>{job.title}</option>)}</select></label>{embedded && <button className="refresh-button" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Refresh</button>}</div>

    {!embedded && activeTab === 'upcoming' && scheduled.length > 0 && <section className="scheduled-interview-list"><div className="interview-section-title"><div><h2>Scheduled interviews</h2><p>Appointments in your interview pipeline.</p></div></div>{scheduled.map((item, index) => { const candidate = interviewCandidate(item) || {}; const job = typeof item.jobId === 'object' ? item.jobId : item.job || {}; return <article className="scheduled-interview-row" key={`${item._id || index}-${index}`}><span className="candidate-avatar">{candidate.name?.slice(0, 1)?.toUpperCase() || '?'}</span><div className="scheduled-interview-main"><strong>{candidate.name || 'Candidate'}</strong><span>{job.title || 'Interview'} · {item.interviewType || 'Interview'}</span></div><div className="scheduled-interview-time"><strong>{new Date(item.scheduledDate).toLocaleDateString()}</strong><span>{new Date(item.scheduledDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div><span className="status-badge interview-status-scheduled">{item.status?.replace('_', ' ')}</span></article>; })}</section>}

    <section className="eligible-candidates-section"><div className="interview-section-title"><div><h2>{activeTab === 'pending' ? embedded ? 'Candidates ready to schedule' : 'Eligible candidates' : activeTab === 'completed' ? 'Completed video interviews' : 'Upcoming video interviews'}</h2><p>{activeTab === 'pending' ? embedded ? 'Schedule one selected candidate at a time.' : 'Select one or more candidates to prepare an interview.' : 'Status is based on interview records.'}</p></div>{activeTab === 'pending' && !embedded && selectedIds.length > 0 && <button className="btn-primary video-continue-button" onClick={continueToSetup}>Continue <span>({selectedIds.length})</span> <span>→</span></button>}</div>
      {loading ? <div className="video-empty-state"><RefreshCw size={18} className="spin-icon" />Loading interview pipeline…</div> : filteredCandidates.length === 0 ? <div className="video-empty-state"><span className="empty-icon"><Video size={18} /></span><strong>{activeTab === 'pending' && !hasLoadedCandidates ? 'Candidate data unavailable.' : activeTab === 'pending' && !hasLoadedJobs ? 'Job data unavailable.' : activeTab === 'pending' && (!hasLoadedInterviews || !hasLoadedVideoRecords) ? 'Interview eligibility data unavailable.' : activeTab === 'pending' && candidates.length === 0 ? 'No candidates available for scheduling.' : activeTab === 'upcoming' && interviews.length === 0 && records.length === 0 && hasLoadedInterviews && hasLoadedVideoRecords ? 'No interviews scheduled yet.' : !hasLoadedInterviews || !hasLoadedVideoRecords ? 'Interview data unavailable.' : activeTab === 'pending' ? 'No candidates need scheduling.' : 'No interviews in this tab yet.'}</strong><p>{activeTab === 'pending' ? candidates.length ? 'All candidates already have an interview or video interview request.' : 'Upload resumes or add candidates to make them available for scheduling.' : 'Interview activity will appear here when interviews are scheduled.'}</p></div> : <div className="eligible-candidate-list">{filteredCandidates.map((candidate) => {
        const id = String(candidate._id || candidate.id);
        const record = records.filter((item) => String(item.candidateId || item.candidate?._id || item.candidate?.id) === id).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
        const schedule = interviews.find((item) => String(interviewCandidate(item)?._id || interviewCandidate(item)?.id || item.candidateId) === id && ['scheduled', 'in_progress'].includes(item.status));
        const checked = selectedIds.includes(id);
        return <React.Fragment key={id}><article className={`eligible-candidate-row${checked ? ' selected' : ''}`} onClick={() => activeTab === 'pending' && !embedded && hasLoadedJobs && selectedJobId && toggleCandidate(candidate)}>
          {activeTab === 'pending' && !embedded ? <input type="checkbox" checked={checked} disabled={!hasLoadedJobs || !selectedJobId} onChange={() => toggleCandidate(candidate)} onClick={(event) => event.stopPropagation()} aria-label={`Select ${candidate.name}`} /> : <span className="candidate-avatar">{candidate.name?.slice(0, 1)?.toUpperCase() || '?'}</span>}
          {activeTab === 'pending' && <span className="candidate-avatar">{candidate.name?.slice(0, 1)?.toUpperCase() || '?'}</span>}
          <div className="eligible-candidate-name"><strong>{candidate.name || 'Unnamed candidate'}</strong><span>{candidate.email || 'No email'} · {selectedJob?.title || 'Select a position'}</span></div>
          <span className="eligible-match-score">{scoreLabel(candidate) == null ? '—' : `${scoreLabel(candidate)}%`}<small>Match</small></span>
          <span className={`status-badge status-${(candidate.status || 'Applied').toLowerCase()}`}>{candidate.status === 'Screened' ? 'Screening' : candidate.status || 'Applied'}</span>
          <span className={`video-record-status ${record?.status || schedule?.status || 'not-requested'}`}>{record?.status || schedule?.status || 'Not scheduled'}</span>
          {record?.sharePath && <a className="video-link-action" href={record.sharePath} onClick={(event) => event.stopPropagation()} target="_blank" rel="noreferrer">Interview link</a>}
          {record?.status === 'completed' && <button className="video-link-action" onClick={(event) => { event.stopPropagation(); setExpandedResultsId(expandedResultsId === id ? '' : id); }}>{expandedResultsId === id ? 'Hide report' : 'View report'}</button>}
          {embedded && activeTab === 'pending' && <button className="candidate-interview-action" disabled={!hasLoadedJobs || !selectedJobId} onClick={() => scheduleOneCandidate(candidate)}>Schedule Interview</button>}
        </article>{expandedResultsId === id && <div className="video-results-inline"><VideoInterviewResults candidateId={candidate._id || candidate.id} /></div>}</React.Fragment>;
      })}</div>}
    </section>

    {setupOpen && <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setSetupOpen(false); }}><section className="detail-modal interview-setup-modal" role="dialog" aria-modal="true" aria-labelledby="interview-setup-title"><header className="detail-modal-header"><div><span className="eyebrow">INTERVIEW WORKFLOW</span><h2 id="interview-setup-title">Prepare interview</h2><p>{selectedCandidates.length} candidate{selectedCandidates.length === 1 ? '' : 's'} selected</p></div><button className="icon-button" onClick={() => setSetupOpen(false)} aria-label="Close setup"><span>×</span></button></header>
      <form className="interview-setup-form" onSubmit={handleSchedule}>
        {selectedCandidates[0] && <div className="selected-interview-candidate"><span>Candidate</span><strong>{selectedCandidates[0].name || 'Candidate'}</strong><small>{selectedCandidates[0].email || ''}</small></div>}
        <div className="setup-fields-grid"><label>Job position<select required value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}><option value="">Select a position</option>{jobs.map((job) => <option key={job._id || job.id} value={job._id || job.id}>{job.title}</option>)}</select></label><label>Interview type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{['Video Interview', 'Technical Interview', 'HR Interview'].map((type) => <option key={type}>{type}</option>)}</select></label><label>Date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label><label>Time<input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} /></label><label>Duration<select value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })}>{['15', '30', '45', '60'].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></label><label>Interviewer email <span className="optional-field-label">Optional</span><input type="email" value={form.interviewerEmail} onChange={(event) => setForm({ ...form, interviewerEmail: event.target.value })} placeholder="interviewer@company.com" /></label></div>
        {form.type.toLowerCase().includes('video') && <div className="interview-questions-field"><div className="interview-questions-heading"><div><h3>Video interview question</h3><p>One question is required to create a candidate video link.</p></div><button type="button" className="candidate-action-button primary-text" onClick={handleGenerateQuestions} disabled={generating}><Sparkles size={14} />{generating ? 'Generating…' : 'Generate with AI'}</button></div><textarea rows={3} value={form.questions} onChange={(event) => setForm({ ...form, questions: event.target.value })} placeholder="Add one question per line…" /><span className="question-helper"><FileText size={13} /> The first question will be used for the video interview link.</span></div>}
        {error && <div className="dashboard-error" role="alert">{error}</div>}
        <footer className="interview-setup-actions"><button type="button" className="candidate-action-button" onClick={() => setSetupOpen(false)} disabled={submitting}>Cancel</button><button type="submit" className="btn-primary" disabled={submitting}><CalendarDays size={15} />{submitting ? 'Scheduling…' : `Schedule ${selectedCandidates.length} interview${selectedCandidates.length === 1 ? '' : 's'}`}</button></footer>
      </form>
    </section></div>}
  </div>;
}
