import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronUp, RefreshCw, Search, Video } from 'lucide-react';
import { getCandidateVideoInterviews, getCandidates, getInterviews, rescheduleInterview, updateInterviewStatus } from '../api/client';
import VideoInterviewsPage from './VideoInterviewsPage';

const tabs = [
  { id: 'toSchedule', label: 'To Schedule' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
];

const candidateFor = (item) => typeof item.candidateId === 'object' ? item.candidateId : item.candidate || {};
const jobFor = (item) => typeof item.jobId === 'object' ? item.jobId : item.job || {};
const localDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const localTimeValue = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const recordId = (item) => String(item?._id || item?.id || '');
const errorMessage = (error) => error?.response?.data?.message || (error?.code === 'ECONNABORTED' ? `The request timed out after ${Math.round((error.config?.timeout || 0) / 1000)} seconds.` : error?.message) || 'Please try again.';

export default function InterviewsPage({ onSessionExpired }) {
  const [interviews, setInterviews] = useState([]);
  const [videoRecords, setVideoRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('toSchedule');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [interviewsLoaded, setInterviewsLoaded] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [expandedId, setExpandedId] = useState('');
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleEmail, setRescheduleEmail] = useState('');

  const loadInterviews = async () => {
    setLoading(true);
    setError('');
    const [interviewResult, candidateResult] = await Promise.allSettled([getInterviews(), getCandidates()]);
    const validInterviews = interviewResult.status === 'fulfilled' && Array.isArray(interviewResult.value?.data);
    const validCandidates = candidateResult.status === 'fulfilled' && Array.isArray(candidateResult.value?.data);
    if (validInterviews) {
      setInterviews(interviewResult.value.data);
      setInterviewsLoaded(true);
    } else {
      setInterviewsLoaded(false);
    }
    if (validCandidates) {
      const results = await Promise.allSettled(candidateResult.value.data.map((candidate) => getCandidateVideoInterviews(recordId(candidate))));
      const invalidLists = results.filter((result) => result.status !== 'fulfilled' || !Array.isArray(result.value?.data));
      setVideoRecords(results.flatMap((result, index) => result.status === 'fulfilled' && Array.isArray(result.value?.data)
        ? result.value.data.map((record) => ({ ...record, candidate: candidateResult.value.data[index] }))
        : []));
      if (invalidLists.some((result) => result.status === 'rejected' && [401, 403].includes(result.reason?.response?.status))) {
        setError('Your session has expired. Please sign in again.');
      } else if (invalidLists.length) {
        setError(`Video interview details unavailable. ${errorMessage(invalidLists[0].reason)}`);
      }
    } else {
      setVideoRecords([]);
    }
    const sourceFailures = [];
    if (!validInterviews) sourceFailures.push(`Interview data unavailable. ${errorMessage(interviewResult.reason)}`);
    if (!validCandidates) sourceFailures.push(`Candidate data unavailable. ${errorMessage(candidateResult.reason)}`);
    const authFailure = [interviewResult, candidateResult].some((result) => result.status === 'rejected' && [401, 403].includes(result.reason?.response?.status));
    if (authFailure) setError('Your session has expired. Please sign in again.');
    else if (sourceFailures.length) setError(sourceFailures.join(' '));
    setLoading(false);
  };

  useEffect(() => { if (activeTab !== 'toSchedule') loadInterviews(); }, [activeTab]);

  const handleScheduled = (message) => {
    setSuccessMessage(message || 'Interview scheduled successfully.');
    setActiveTab('upcoming');
  };

  const visibleInterviews = useMemo(() => interviews.filter((interview) => {
    if (activeTab === 'upcoming') return ['scheduled', 'in_progress'].includes(interview.status);
    if (activeTab === 'completed') return interview.status === 'completed';
    return false;
  }).filter((interview) => {
    const candidate = candidateFor(interview); const job = jobFor(interview);
    return `${candidate.name || ''} ${candidate.email || ''} ${job.title || ''}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => new Date(a.scheduledDate || 0) - new Date(b.scheduledDate || 0)), [interviews, activeTab, query]);

  const videoVisibleRecords = useMemo(() => videoRecords.filter((record) => {
    const candidate = record.candidate || {};
    const textMatches = `${candidate.name || ''} ${candidate.email || ''}`.toLowerCase().includes(query.toLowerCase());
    if (!textMatches) return false;
    const id = String(record.candidateId || record.candidate?._id || record.candidate?.id || '');
    const hasUnifiedInterview = interviews.some((interview) => String(candidateFor(interview)?._id || candidateFor(interview)?.id || interview.candidateId || '') === id && (activeTab === 'upcoming' ? ['scheduled', 'in_progress'].includes(interview.status) : interview.status === 'completed'));
    if (hasUnifiedInterview) return false;
    if (activeTab === 'upcoming') return ['pending', 'processing'].includes(record.status);
    if (activeTab === 'completed') return record.status === 'completed';
    return false;
  }), [videoRecords, interviews, activeTab, query]);

  const tabCounts = useMemo(() => ({
    upcoming: interviews.filter((item) => ['scheduled', 'in_progress'].includes(item.status)).length + videoRecords.filter((record) => ['pending', 'processing'].includes(record.status) && !interviews.some((item) => String(candidateFor(item)?._id || candidateFor(item)?.id || item.candidateId || '') === String(record.candidateId || record.candidate?._id || record.candidate?.id) && ['scheduled', 'in_progress'].includes(item.status))).length,
    completed: interviews.filter((item) => item.status === 'completed').length + videoRecords.filter((record) => record.status === 'completed' && !interviews.some((item) => String(candidateFor(item)?._id || candidateFor(item)?.id || item.candidateId || '') === String(record.candidateId || record.candidate?._id || record.candidate?.id) && item.status === 'completed')).length,
  }), [interviews, videoRecords]);

  const changeStatus = async (interview, status) => {
    const id = recordId(interview);
    setUpdatingId(id);
    setError('');
    try {
      const response = await updateInterviewStatus(id, status);
      setInterviews((current) => current.map((item) => recordId(item) === id ? response.data : item));
    } catch (updateError) {
      setError([401, 403].includes(updateError.response?.status) ? 'Your session has expired. Please sign in again.' : `Unable to update interview status. ${errorMessage(updateError)}`);
    } finally { setUpdatingId(''); }
  };

  const beginReschedule = (interview) => {
    const when = new Date(interview.scheduledDate);
    setRescheduleItem(interview); setRescheduleDate(localDateValue(when)); setRescheduleTime(localTimeValue(when)); setRescheduleEmail(interview.interviewerEmail || '');
  };

  const saveReschedule = async (event) => {
    event.preventDefault();
    if (!rescheduleItem) return;
    const id = recordId(rescheduleItem);
    setUpdatingId(id); setError('');
    try {
      const response = await rescheduleInterview(id, { scheduledDate: new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString(), interviewerEmail: rescheduleEmail });
      setInterviews((current) => current.map((item) => recordId(item) === id ? response.data : item));
      setRescheduleItem(null);
    } catch (updateError) {
      setError([401, 403].includes(updateError.response?.status) ? 'Your session has expired. Please sign in again.' : `Unable to reschedule interview. ${errorMessage(updateError)}`);
    } finally { setUpdatingId(''); }
  };

  return <div className="interviews-page">
    <header className="page-header video-interviews-header"><div><div className="eyebrow">TALENT OPERATIONS <span /> INTERVIEW PIPELINE</div><h1 className="page-title">Interviews</h1><p className="page-subtitle">See who needs scheduling and manage every interview in one place.</p></div>{activeTab !== 'toSchedule' && <button className="refresh-button" onClick={loadInterviews} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} /> Refresh</button>}</header>
    {successMessage && <div className="video-notice"><Check size={15} />{successMessage}</div>}
    {error && <div className="dashboard-error" role="alert"><span>{error}</span>{error.startsWith('Your session has expired') ? <button onClick={() => onSessionExpired?.()}>Sign in again</button> : <button onClick={loadInterviews} disabled={loading}>Retry</button>}</div>}
    <nav className="interview-pipeline-tabs" aria-label="Interview workflow stages">{tabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}{tab.id !== 'toSchedule' && <span>{tabCounts[tab.id]}</span>}</button>)}</nav>
    {activeTab === 'toSchedule' ? <VideoInterviewsPage embedded onSessionExpired={onSessionExpired} onScheduled={handleScheduled} /> : <>
      <div className="interview-table-toolbar"><div><h2>{activeTab === 'upcoming' ? 'Upcoming interviews' : 'Completed interviews'}</h2><p>{visibleInterviews.length + videoVisibleRecords.length} interview{visibleInterviews.length + videoVisibleRecords.length === 1 ? '' : 's'}</p></div><label className="candidate-list-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates or roles..." /></label></div>
      <section className="dashboard-panel interview-table-panel">
        {loading ? <div className="video-empty-state"><RefreshCw size={18} className="spin-icon" />Loading interviews...</div> : !interviewsLoaded && !error ? <div className="video-empty-state">Unable to load interview data. Please try again.</div> : visibleInterviews.length + videoVisibleRecords.length === 0 ? <div className="video-empty-state"><span className="empty-icon"><CalendarDays size={18} /></span><strong>{activeTab === 'upcoming' ? 'No interviews scheduled yet.' : 'No completed interviews yet.'}</strong><p>{activeTab === 'upcoming' ? 'Scheduled interviews and video interview links will appear here.' : 'Completed interviews will appear here.'}</p></div> : <div className="table-scroll"><table className="interview-table"><thead><tr><th>Candidate</th><th>Position</th><th>Date &amp; time</th><th>Type</th><th>Interviewer</th><th>Status</th><th>Details</th></tr></thead><tbody>
          {visibleInterviews.map((interview) => {
            const candidate = candidateFor(interview); const job = jobFor(interview); const id = recordId(interview);
            const when = interview.scheduledDate ? new Date(interview.scheduledDate) : null;
            const matchingVideoRecord = videoRecords.find((record) => String(record.candidateId || record.candidate?._id || record.candidate?.id) === String(candidate._id || candidate.id) && record.sharePath);
            const expanded = expandedId === id;
            return <React.Fragment key={id}><tr><td><div className="candidate-cell"><span className="candidate-avatar">{candidate.name?.slice(0, 1)?.toUpperCase() || '?'}</span><span><strong>{candidate.name || 'Candidate'}</strong><small>{candidate.email || ''}</small></span></div></td><td>{job.title || 'Position'}</td><td><strong>{when?.toLocaleDateString() || '—'}</strong><small className="interview-date-time">{when?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) || ''} {interview.durationMinutes ? `· ${interview.durationMinutes} min` : ''}</small></td><td>{interview.interviewType || 'Interview'}</td><td>{interview.interviewerEmail || '—'}</td><td><span className={`status-badge interview-status-${interview.status}`}>{interview.status?.replace('_', ' ')}</span></td><td><div className="interview-row-actions">{matchingVideoRecord?.sharePath && <a className="video-link-action" href={matchingVideoRecord.sharePath} target="_blank" rel="noreferrer">Interview link</a>}{activeTab === 'upcoming' && <><button disabled={updatingId === id} onClick={() => beginReschedule(interview)}>Reschedule</button><button disabled={updatingId === id} onClick={() => changeStatus(interview, 'in_progress')} title="Mark in progress"><Video size={14} /></button><button disabled={updatingId === id} onClick={() => changeStatus(interview, 'completed')} title="Mark completed"><Check size={14} /></button></>}<button onClick={() => setExpandedId(expanded ? '' : id)} aria-expanded={expanded}>{expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Questions</button></div></td></tr>{expanded && <tr className="interview-detail-row"><td colSpan="7"><strong>Interview questions</strong>{Array.isArray(interview.questions) && interview.questions.length ? <ol>{interview.questions.map((question, index) => <li key={`${id}-q-${index}`}>{question}</li>)}</ol> : <p>No questions are attached to this interview.</p>}</td></tr>}</React.Fragment>;
          })}
          {videoVisibleRecords.map((record, index) => <tr key={`video-${recordId(record) || index}`}><td><div className="candidate-cell"><span className="candidate-avatar">{record.candidate?.name?.slice(0, 1)?.toUpperCase() || '?'}</span><span><strong>{record.candidate?.name || 'Candidate'}</strong><small>{record.candidate?.email || ''}</small></span></div></td><td>{jobFor(record).title || 'Position'}</td><td><strong>{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '—'}</strong><small className="interview-date-time">Video interview request</small></td><td>Video Interview</td><td>—</td><td><span className={`status-badge interview-status-${record.status}`}>{record.status}</span></td><td>{record.sharePath ? <a className="video-link-action" href={record.sharePath} target="_blank" rel="noreferrer">Interview link</a> : '—'}</td></tr>)}
        </tbody></table></div>}
      </section>
    </>}
    {rescheduleItem && <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRescheduleItem(null); }}><section className="detail-modal reschedule-modal" role="dialog" aria-modal="true" aria-labelledby="reschedule-title"><header className="detail-modal-header"><div><span className="eyebrow">INTERVIEW PIPELINE</span><h2 id="reschedule-title">Reschedule interview</h2><p>{candidateFor(rescheduleItem).name} · {jobFor(rescheduleItem).title}</p></div></header><form className="interview-setup-form" onSubmit={saveReschedule}><div className="setup-fields-grid"><label>New date<input required type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} /></label><label>New time<input required type="time" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} /></label><label className="reschedule-email">Interviewer email<input required type="email" value={rescheduleEmail} onChange={(event) => setRescheduleEmail(event.target.value)} /></label></div><footer className="interview-setup-actions"><button type="button" className="candidate-action-button" onClick={() => setRescheduleItem(null)}>Cancel</button><button type="submit" className="btn-primary" disabled={Boolean(updatingId)}>Save new time</button></footer></form></section></div>}
  </div>;
}
