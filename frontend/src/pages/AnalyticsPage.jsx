import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BriefcaseBusiness, CalendarClock, CheckCircle2, Clock3, FileUser, Info, RefreshCw, Sparkles, Upload, UserPlus, Users, Video } from 'lucide-react';
import { getAnalyticsData, getCandidates, getInterviews, getJobs } from '../api/client';

const funnelStages = [
  { key: 'Applied', label: 'Applications', tone: 'blue' },
  { key: 'Qualified', label: 'Qualified', tone: 'cyan' },
  { key: 'Interview', label: 'Interviewed', tone: 'violet' },
  { key: 'Offered', label: 'Offers', tone: 'green' },
  { key: 'Rejected', label: 'Rejected', tone: 'muted' },
];

const candidateId = (candidate) => String(candidate?._id || candidate?.id || '');
const interviewCandidate = (interview) => typeof interview?.candidateId === 'object' ? interview.candidateId : interview?.candidate || {};
const interviewJob = (interview) => typeof interview?.jobId === 'object' ? interview.jobId : interview?.job || {};
const sameLocalDay = (left, right) => left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();

function formatAddedDate(value, now = new Date()) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  if (sameLocalDay(date, now)) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameLocalDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatInterviewTime(value, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = sameLocalDay(date, now) ? 'Today' : sameLocalDay(date, tomorrow) ? 'Tomorrow' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${day} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function greetingFor(user, now) {
  const name = user?.name || user?.full_name || user?.username || 'Recruiter';
  const hour = now.getHours();
  const day = now.getDay();
  if (hour < 5) return `🌙 Good evening, ${name} ✨`;
  if (hour < 12) {
    if (day === 6) return `🌿 Good morning, ${name} ☕`;
    if (day === 0) return `☀️ Good morning, ${name} 🌿`;
    if (day === 1) return `☀️ Good morning, ${name} — let's kick off the week 🚀`;
    return `☀️ Good morning, ${name} ✨`;
  }
  if (hour < 17) return day === 5 ? `✨ Good afternoon, ${name} 🎯` : `🌤️ Good afternoon, ${name} 🚀`;
  if (day === 5) return `✨ Good evening, ${name} — let's wrap up the week 🎯`;
  return `🌆 Good evening, ${name} ✨`;
}

function MetricCard({ label, value, note, icon: Icon, tone, onClick }) {
  return <button type="button" className="metric-card metric-card-button" onClick={onClick}>
    <span className="metric-card-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></span>
    <strong className="metric-value">{value}</strong><span className="metric-note">{note}</span>
  </button>;
}

function PanelHeading({ title, detail, action }) {
  return <div className="panel-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action || <span className="panel-menu" aria-hidden="true">···</span>}</div>;
}

function HiringAlert({ alert, onNavigate }) {
  const Icon = alert.icon;
  return <article className={`hiring-alert hiring-alert-${alert.tone}`}>
    <span className="hiring-alert-icon"><Icon size={15} /></span>
    <div className="hiring-alert-copy"><span className="hiring-alert-priority">{alert.priority}</span><strong>{alert.title}</strong><p>{alert.description}</p></div>
    <button className="hiring-alert-action" onClick={() => onNavigate(alert.target)} aria-label={alert.action}>{alert.action}<ArrowRight size={13} /></button>
  </article>;
}

export default function AnalyticsPage({ onNavigate, user, matchScores = {} }) {
  const [data, setData] = useState({ analytics: null, candidates: [], jobs: [], interviews: [] });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState('');
  const [loadedSources, setLoadedSources] = useState({ candidates: false, jobs: false, interviews: false });
  const now = new Date();

  const fetchDashboard = async () => {
    setLoading(true); setError('');
    const [analyticsResult, candidatesResult, jobsResult, interviewsResult] = await Promise.allSettled([getAnalyticsData(), getCandidates(), getJobs(), getInterviews()]);
    const analytics = analyticsResult.status === 'fulfilled' ? analyticsResult.value?.data || null : null;
    const candidates = candidatesResult.status === 'fulfilled' ? candidatesResult.value?.data || [] : [];
    const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value?.data || [] : [];
    const interviews = interviewsResult.status === 'fulfilled' ? interviewsResult.value?.data || [] : [];
    setLoadedSources({ candidates: candidatesResult.status === 'fulfilled', jobs: jobsResult.status === 'fulfilled', interviews: interviewsResult.status === 'fulfilled' });
    setData({ analytics, candidates, jobs, interviews });
    const fulfilled = [analyticsResult, candidatesResult, jobsResult, interviewsResult].filter((result) => result.status === 'fulfilled').length;
    if (!fulfilled) setError('Dashboard data could not be loaded. Check your connection and retry.');
    else if (fulfilled < 4) setError('Some dashboard data could not be refreshed. Values shown may be incomplete.');
    setHasLoaded(true); setLoading(false);
  };

  useEffect(() => { fetchDashboard(); }, []);

  const counts = useMemo(() => {
    const result = { Applied: 0, Qualified: 0, Interview: 0, Offered: 0, Rejected: 0 };
    if (!loadedSources.candidates && data.analytics?.pipelineBreakdown) {
      const pipeline = data.analytics.pipelineBreakdown;
      result.Applied = pipeline.Applied || 0;
      result.Qualified = (pipeline.Screened || 0) + (pipeline.Screening || 0) + (pipeline.Shortlisted || 0) + (pipeline.Qualified || 0);
      result.Interview = pipeline.Interview || 0;
      result.Offered = (pipeline.Offered || 0) + (pipeline.Offer || 0) + (pipeline.Hired || 0);
      result.Rejected = pipeline.Rejected || 0;
      return result;
    }
    data.candidates.forEach((candidate) => {
      const status = candidate.status || 'Applied';
      if (status === 'Applied') result.Applied += 1;
      else if (['Screened', 'Screening', 'Shortlisted', 'Qualified'].includes(status)) result.Qualified += 1;
      else if (status === 'Interview') result.Interview += 1;
      else if (['Offered', 'Offer', 'Hired'].includes(status)) result.Offered += 1;
      else if (status === 'Rejected') result.Rejected += 1;
      else result.Applied += 1;
    });
    return result;
  }, [data.candidates, data.analytics, loadedSources.candidates]);

  const topSkills = useMemo(() => {
    const skillCounts = new Map();
    data.candidates.forEach((candidate) => (candidate.skills || []).forEach((skill) => {
      const label = String(skill || '').trim();
      if (label) skillCounts.set(label, (skillCounts.get(label) || 0) + 1);
    }));
    if (!skillCounts.size && data.analytics?.topSkills) return data.analytics.topSkills.slice(0, 6);
    return [...skillCounts.entries()].map(([skill, count]) => ({ skill, count })).sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill)).slice(0, 6);
  }, [data.candidates, data.analytics]);

  const activeJobs = data.jobs.filter((job) => !job.status || job.status === 'open');
  const totalCandidates = loadedSources.candidates ? data.candidates.length : data.analytics?.totalCandidates || 0;
  const jobCount = loadedSources.jobs ? activeJobs.length : data.analytics?.totalJobs || 0;
  const interviewStageCount = loadedSources.candidates ? counts.Interview : data.analytics?.pipelineBreakdown?.Interview || 0;
  const upcomingInterviews = useMemo(() => data.interviews
    .filter((interview) => ['scheduled', 'in_progress'].includes(interview.status) && new Date(interview.scheduledDate).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate)).slice(0, 3), [data.interviews]);

  const alerts = useMemo(() => {
    const items = [];
    const overdue = data.candidates.filter((candidate) => {
      if ((candidate.status || 'Applied') !== 'Applied' || !candidate.createdAt) return false;
      return now.getTime() - new Date(candidate.createdAt).getTime() > 7 * 24 * 60 * 60 * 1000;
    });
    if (overdue.length) items.push({ tone: 'red', priority: 'ACTION REQUIRED', icon: AlertTriangle, title: 'Candidates waiting too long', description: `${overdue.length} candidate${overdue.length === 1 ? ' has' : 's have'} remained in Applied for more than 7 days.`, action: 'View candidates', target: 'match' });

    const inNextDay = data.interviews.filter((interview) => {
      const time = new Date(interview.scheduledDate).getTime();
      return ['scheduled', 'in_progress'].includes(interview.status) && time >= now.getTime() && time <= now.getTime() + 24 * 60 * 60 * 1000;
    }).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    if (inNextDay.length) {
      const upcoming = inNextDay[0]; const candidate = interviewCandidate(upcoming); const job = interviewJob(upcoming);
      items.push({ tone: 'yellow', priority: 'UPCOMING', icon: CalendarClock, title: 'Interview coming up', description: `${candidate.name || 'Candidate'} · ${job.title || 'Role'} · ${formatInterviewTime(upcoming.scheduledDate, now)}${inNextDay.length > 1 ? ` (+${inNextDay.length - 1} more)` : ''}`, action: 'View interview', target: 'interviews' });
    }

    const screening = data.candidates.filter((candidate) => ['Screened', 'Screening', 'Shortlisted', 'Qualified'].includes(candidate.status)).length;
    if (screening) items.push({ tone: 'blue', priority: 'HIRING UPDATE', icon: Info, title: 'Candidates in screening', description: `${screening} candidate${screening === 1 ? ' is' : 's are'} currently in screening.`, action: 'View pipeline', target: 'match' });

    const addedToday = data.candidates.filter((candidate) => candidate.createdAt && sameLocalDay(new Date(candidate.createdAt), now)).length;
    if (addedToday) items.push({ tone: 'green', priority: 'NEW CANDIDATES', icon: CheckCircle2, title: 'New talent added today', description: `${addedToday} new candidate${addedToday === 1 ? ' was' : 's were'} added to your pipeline today.`, action: 'View candidates', target: 'match' });

    if (loadedSources.jobs && !activeJobs.length) items.push({ tone: 'blue', priority: 'HIRING UPDATE', icon: BriefcaseBusiness, title: 'No active job postings', description: 'Create a job posting to start building a role-specific pipeline.', action: 'Create job', target: 'jobs' });
    return items;
  }, [data.candidates, data.interviews, loadedSources.jobs, activeJobs.length, now]);

  const recentCandidates = loadedSources.candidates ? data.candidates.slice(0, 5) : data.analytics?.recentCandidates || [];
  const candidateRole = (candidate) => {
    const cached = matchScores[candidateId(candidate)];
    const matchedJob = cached?.jobId && data.jobs.find((job) => String(job._id || job.id) === String(cached.jobId));
    if (matchedJob?.title) return matchedJob.title;
    const relatedInterview = data.interviews.find((interview) => String(interviewCandidate(interview)?._id || interviewCandidate(interview)?.id || interview.candidateId) === candidateId(candidate));
    return interviewJob(relatedInterview)?.title || 'Not assigned';
  };

  const value = (number, available = true) => loading && !hasLoaded ? '—' : available && number != null ? Number(number || 0).toLocaleString() : '—';
  const totalStages = Object.values(counts).reduce((total, count) => total + count, 0);

  return <div className="dashboard-page">
    <header className="page-header dashboard-header">
      <div><div className="eyebrow">TALENT OPERATIONS <span /> LIVE OVERVIEW</div><h1 className="page-title">{greetingFor(user, now)}</h1><p className="page-subtitle">Here's what's happening with your hiring pipeline today.</p></div>
      <button className="refresh-button" onClick={fetchDashboard} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} /> {loading ? 'Refreshing…' : 'Refresh'}</button>
    </header>

    {error && <div className="dashboard-error" role="alert"><span>{error}</span>{!loading && <button onClick={fetchDashboard}>Retry</button>}</div>}

    <section className="metric-grid" aria-label="Recruitment metrics">
      <MetricCard label="TOTAL CANDIDATES" value={value(totalCandidates, loadedSources.candidates || Boolean(data.analytics))} note="Across your talent pipeline" icon={FileUser} tone="blue" onClick={() => onNavigate?.('match')} />
      <MetricCard label="JOB POSTINGS" value={value(jobCount, loadedSources.jobs || Boolean(data.analytics))} note="Active roles in your workspace" icon={BriefcaseBusiness} tone="cyan" onClick={() => onNavigate?.('jobs')} />
      <MetricCard label="INTERVIEWS" value={value(interviewStageCount, loadedSources.candidates || Boolean(data.analytics))} note="Candidates currently in interview stage" icon={Clock3} tone="violet" onClick={() => onNavigate?.('interviews')} />
      <MetricCard label="VIDEO INTERVIEWS" value={value(data.analytics?.totalVideoInterviews, Boolean(data.analytics))} note="Video interview requests" icon={Video} tone="green" onClick={() => onNavigate?.('videoInterviews')} />
    </section>

    <section className="dashboard-grid dashboard-grid-primary">
      <article className="dashboard-panel funnel-panel"><PanelHeading title="Recruitment funnel" detail={`${totalCandidates.toLocaleString()} candidates across all stages`} />
        {loading && !hasLoaded ? <div className="panel-loading">Loading pipeline…</div> : totalCandidates === 0 ? <div className="empty-panel"><span className="empty-icon"><Users size={18} /></span><strong>No candidates yet</strong><p>Upload resumes or add your first candidate.</p><button className="inline-dashboard-action" onClick={() => onNavigate?.('upload')}>Upload Resume <ArrowRight size={13} /></button></div> : !loadedSources.candidates && !data.analytics ? <div className="empty-panel"><strong>Candidate data unavailable</strong></div> : <div className="funnel-list">{funnelStages.map((stage) => { const count = counts[stage.key] || 0; const pct = totalStages ? (count / totalStages) * 100 : 0; return <div className="funnel-row" key={stage.key}><div className="funnel-label"><span>{stage.label}</span><strong>{count.toLocaleString()}</strong></div><div className="funnel-track"><span className={`funnel-fill ${stage.tone}`} style={{ width: `${pct}%` }} /></div></div>; })}</div>}
        <div className="funnel-footnote"><span><CheckCircle2 size={14} /> Based on candidate pipeline stages</span><button onClick={() => onNavigate?.('match')}>View candidates <ArrowRight size={14} /></button></div>
      </article>

      <article className="dashboard-panel skills-panel"><PanelHeading title="Top candidate skills" detail="Most common skills from parsed resumes" />
        {loading && !hasLoaded ? <div className="panel-loading">Loading skills…</div> : topSkills.length === 0 ? <div className="empty-panel"><span className="empty-icon"><Sparkles size={18} /></span><strong>No candidate skill data available yet.</strong></div> : <div className="skills-list">{topSkills.map((skill, index) => <div className="skill-row" key={skill.skill}><span className="skill-rank">{String(index + 1).padStart(2, '0')}</span><span className="skill-name">{skill.skill}</span><span className="skill-bar-track"><span style={{ width: `${Math.min(100, (skill.count / Math.max(1, topSkills[0].count)) * 100)}%` }} /></span><strong>{skill.count}</strong></div>)}</div>}
        <div className="funnel-footnote"><span>Resume skill mentions</span><span className="skill-legend"><i /> Top 6</span></div>
      </article>
    </section>

    <section className="dashboard-grid dashboard-grid-secondary">
      <article className="dashboard-panel recent-panel"><PanelHeading title="Recent candidates" detail="Latest additions to your talent pool" action={<button className="panel-link" onClick={() => onNavigate?.('match')}>View all <ArrowRight size={13} /></button>} />
        {loading && !hasLoaded ? <div className="panel-loading">Loading candidates…</div> : recentCandidates.length === 0 ? loadedSources.candidates || data.analytics ? <div className="empty-panel compact"><strong>No candidates yet.</strong><p>Upload resumes or add your first candidate.</p><button className="inline-dashboard-action" onClick={() => onNavigate?.('upload')}>Upload Resume <ArrowRight size={13} /></button></div> : <div className="empty-panel compact"><strong>Candidate data unavailable.</strong></div> : <div className="table-scroll"><table className="dashboard-table recent-candidates-table"><thead><tr><th>Candidate</th><th>Role</th><th>Stage</th><th>Match</th><th>Added</th></tr></thead><tbody>{recentCandidates.map((candidate) => { const cachedMatch = matchScores[candidateId(candidate)]; const stage = candidate.status || 'Applied'; return <tr key={candidateId(candidate)}><td><div className="candidate-cell"><span className="candidate-avatar">{(candidate.name || '?').slice(0, 1).toUpperCase()}</span><span><strong>{candidate.name || 'Unnamed candidate'}</strong><small>{candidate.email}</small></span></div></td><td className="table-muted">{candidateRole(candidate)}</td><td><span className={`status-badge status-${stage.toLowerCase()}`}>{stage === 'Screened' ? 'Screening' : stage}</span></td><td className="table-match-score">{cachedMatch?.matchScore != null ? `${cachedMatch.matchScore}%` : 'Not assessed'}</td><td className="table-muted">{formatAddedDate(candidate.createdAt, now)}</td></tr>; })}</tbody></table></div>}
      </article>

      <article className="dashboard-panel alerts-panel"><PanelHeading title="Hiring alerts" detail="Actions and updates from your pipeline" />
        {loading && !hasLoaded ? <div className="panel-loading">Checking hiring activity…</div> : alerts.length === 0 && loadedSources.candidates && loadedSources.jobs && loadedSources.interviews ? <div className="empty-panel alerts-empty"><span className="empty-icon"><CheckCircle2 size={18} /></span><strong>You're all caught up.</strong><p>No hiring actions need your attention.</p></div> : alerts.length === 0 ? <div className="empty-panel alerts-empty"><strong>Hiring activity unavailable.</strong></div> : <div className="hiring-alert-list">{alerts.map((alert, index) => <HiringAlert key={`${alert.priority}-${alert.title}-${index}`} alert={alert} onNavigate={onNavigate} />)}</div>}
      </article>
    </section>

    <section className="dashboard-grid dashboard-grid-bottom">
      <article className="dashboard-panel upcoming-panel"><PanelHeading title="Upcoming interviews" detail="Your next scheduled conversations" action={<button className="panel-link" onClick={() => onNavigate?.('interviews')}>View all interviews <ArrowRight size={13} /></button>} />
        {loading && !hasLoaded ? <div className="panel-loading">Loading interviews…</div> : !loadedSources.interviews ? <div className="empty-panel compact"><strong>Interview data unavailable.</strong></div> : upcomingInterviews.length === 0 ? <div className="empty-panel compact"><strong>No upcoming interviews.</strong><p>Scheduled interviews will appear here.</p></div> : <div className="upcoming-list">{upcomingInterviews.map((interview) => { const candidate = interviewCandidate(interview); const job = interviewJob(interview); return <div className="upcoming-interview-row" key={interview._id || interview.id}><span className="candidate-avatar">{(candidate.name || '?').slice(0, 1).toUpperCase()}</span><span className="upcoming-interview-person"><strong>{candidate.name || 'Candidate'}</strong><small>{job.title || 'Role not assigned'}</small></span><span className="upcoming-interview-time">{formatInterviewTime(interview.scheduledDate, now)}</span><span className="upcoming-interview-type">{interview.interviewType || 'Interview'}</span><span className={`upcoming-interview-status status-${(interview.status || 'scheduled').toLowerCase()}`}>{(interview.status || 'scheduled').replace('_', ' ')}</span><button className="upcoming-view-button" onClick={() => onNavigate?.('interviews')} aria-label={`View interview with ${candidate.name || 'candidate'}`}><ArrowRight size={14} /></button></div>; })}</div>}
      </article>
      <article className="dashboard-panel quick-actions-panel"><PanelHeading title="Quick actions" detail="Keep your hiring moving" />
        <div className="quick-action-list"><button onClick={() => onNavigate?.('upload')}><span><UserPlus size={15} /></span><strong>Add candidate</strong><ArrowRight size={13} /></button><button onClick={() => onNavigate?.('jobs')}><span><BriefcaseBusiness size={15} /></span><strong>Post a job</strong><ArrowRight size={13} /></button><button onClick={() => onNavigate?.('videoInterviews')}><span><CalendarClock size={15} /></span><strong>Schedule interview</strong><ArrowRight size={13} /></button><button onClick={() => onNavigate?.('upload')}><span><Upload size={15} /></span><strong>Upload resume</strong><ArrowRight size={13} /></button></div>
      </article>
    </section>
  </div>;
}
