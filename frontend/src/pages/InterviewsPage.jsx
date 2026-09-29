import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, RefreshCw, Search, Video } from 'lucide-react';
import { getInterviews, rescheduleInterview, updateInterviewStatus } from '../api/client';

const stageTabs = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const candidateFor = (item) => typeof item.candidateId === 'object' ? item.candidateId : item.candidate || {};
const jobFor = (item) => typeof item.jobId === 'object' ? item.jobId : item.job || {};
const localDateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const localTimeValue = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export default function InterviewsPage() {
  const [interviews, setInterviews] = useState([]);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleEmail, setRescheduleEmail] = useState('');

  const loadInterviews = async () => {
    setLoading(true); setError('');
    try { const response = await getInterviews(); setInterviews(response.data || []); }
    catch (loadError) { setError(loadError.response?.data?.message || 'Could not load interview records.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadInterviews(); }, []);

  const counts = useMemo(() => Object.fromEntries(stageTabs.map((tab) => [tab.id, interviews.filter((interview) => interview.status === tab.id).length])), [interviews]);
  const visible = interviews.filter((interview) => interview.status === activeTab).filter((interview) => {
    const candidate = candidateFor(interview); const job = jobFor(interview);
    return `${candidate.name || ''} ${candidate.email || ''} ${job.title || ''}`.toLowerCase().includes(query.toLowerCase());
  });

  const changeStatus = async (interview, status) => {
    const id = interview._id || interview.id;
    setUpdatingId(id);
    try {
      const response = await updateInterviewStatus(id, status);
      setInterviews((current) => current.map((item) => (item._id || item.id) === id ? response.data : item));
    } catch (updateError) { setError(updateError.response?.data?.message || 'Could not update interview status.'); }
    finally { setUpdatingId(''); }
  };

  const beginReschedule = (interview) => {
    const when = new Date(interview.scheduledDate);
    setRescheduleItem(interview); setRescheduleDate(localDateValue(when)); setRescheduleTime(localTimeValue(when)); setRescheduleEmail(interview.interviewerEmail || '');
  };

  const saveReschedule = async (event) => {
    event.preventDefault();
    if (!rescheduleItem) return;
    const id = rescheduleItem._id || rescheduleItem.id;
    setUpdatingId(id); setError('');
    try {
      const response = await rescheduleInterview(id, { scheduledDate: new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString(), interviewerEmail: rescheduleEmail });
      setInterviews((current) => current.map((item) => (item._id || item.id) === id ? response.data : item));
      setRescheduleItem(null);
    } catch (updateError) { setError(updateError.response?.data?.message || 'Could not reschedule interview.'); }
    finally { setUpdatingId(''); }
  };

  return <div className="interviews-page">
    <header className="page-header video-interviews-header"><div><div className="eyebrow">TALENT OPERATIONS <span /> INTERVIEW PIPELINE</div><h1 className="page-title">Interviews</h1><p className="page-subtitle">Track scheduled conversations and keep your interview pipeline moving.</p></div><button className="refresh-button" onClick={loadInterviews} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} /> Refresh</button></header>
    {error && <div className="dashboard-error" role="alert"><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
    <nav className="interview-pipeline-tabs" aria-label="Interview statuses">{stageTabs.map((tab) => <button key={tab.id} className={activeTab === tab.id ? 'active' : ''} onClick={() => setActiveTab(tab.id)}>{tab.label}<span>{counts[tab.id] || 0}</span></button>)}</nav>
    <section className="dashboard-panel interview-table-panel"><div className="interview-table-toolbar"><div><h2>{stageTabs.find((tab) => tab.id === activeTab)?.label} interviews</h2><p>{visible.length} interview{visible.length === 1 ? '' : 's'}</p></div><label className="candidate-list-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates or roles..." /></label></div>
      {loading ? <div className="video-empty-state"><RefreshCw size={18} className="spin-icon" />Loading interview records…</div> : visible.length === 0 ? <div className="video-empty-state"><span className="empty-icon"><CalendarDays size={18} /></span><strong>No {stageTabs.find((tab) => tab.id === activeTab)?.label.toLowerCase()} interviews</strong><p>Schedule an interview from the Video Interviews workflow to see it here.</p></div> : <div className="table-scroll"><table className="interview-table"><thead><tr><th>Candidate</th><th>Position</th><th>Date &amp; time</th><th>Type</th><th>Interviewer</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map((interview) => {
        const candidate = candidateFor(interview); const job = jobFor(interview); const id = interview._id || interview.id;
        const when = interview.scheduledDate ? new Date(interview.scheduledDate) : null;
        return <tr key={id}><td><div className="candidate-cell"><span className="candidate-avatar">{candidate.name?.slice(0, 1)?.toUpperCase() || '?'}</span><span><strong>{candidate.name || 'Candidate'}</strong><small>{candidate.email || ''}</small></span></div></td><td>{job.title || 'Position'}</td><td><strong>{when?.toLocaleDateString() || '—'}</strong><small className="interview-date-time">{when?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) || ''} {interview.durationMinutes ? `· ${interview.durationMinutes} min` : ''}</small></td><td>{interview.interviewType || 'Live Video Interview'}</td><td>{interview.interviewerEmail || '—'}</td><td><span className={`status-badge interview-status-${interview.status}`}>{interview.status?.replace('_', ' ')}</span></td><td><div className="interview-row-actions">{activeTab === 'scheduled' && <><button disabled={updatingId === id} onClick={() => beginReschedule(interview)} title="Reschedule">Reschedule</button><button disabled={updatingId === id} onClick={() => changeStatus(interview, 'in_progress')} title="Mark in progress"><Video size={14} /></button><button disabled={updatingId === id} onClick={() => changeStatus(interview, 'completed')} title="Mark completed"><Check size={14} /></button><button disabled={updatingId === id} onClick={() => changeStatus(interview, 'cancelled')} title="Cancel interview">Cancel</button></>}{activeTab === 'in_progress' && <button disabled={updatingId === id} onClick={() => changeStatus(interview, 'completed')}>Complete</button>}</div></td></tr>;
      })}</tbody></table></div>}
    </section>
    {rescheduleItem && <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRescheduleItem(null); }}><section className="detail-modal reschedule-modal" role="dialog" aria-modal="true" aria-labelledby="reschedule-title"><header className="detail-modal-header"><div><span className="eyebrow">INTERVIEW PIPELINE</span><h2 id="reschedule-title">Reschedule interview</h2><p>{candidateFor(rescheduleItem).name} · {jobFor(rescheduleItem).title}</p></div></header><form className="interview-setup-form" onSubmit={saveReschedule}><div className="setup-fields-grid"><label>New date<input required type="date" value={rescheduleDate} onChange={(event) => setRescheduleDate(event.target.value)} /></label><label>New time<input required type="time" value={rescheduleTime} onChange={(event) => setRescheduleTime(event.target.value)} /></label><label className="reschedule-email">Interviewer email<input required type="email" value={rescheduleEmail} onChange={(event) => setRescheduleEmail(event.target.value)} /></label></div><footer className="interview-setup-actions"><button type="button" className="candidate-action-button" onClick={() => setRescheduleItem(null)}>Cancel</button><button type="submit" className="btn-primary" disabled={Boolean(updatingId)}>Save new time</button></footer></form></section></div>}
  </div>;
}
