import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, BriefcaseBusiness, CheckCircle2, Clock3, FileUser, RefreshCw, Video } from 'lucide-react';
import { getAnalyticsData } from '../api/client';

const stages = [
  { key: 'Applied', label: 'Applications', tone: 'blue' },
  { key: 'Screened', label: 'Qualified', tone: 'cyan' },
  { key: 'Interview', label: 'Interviewed', tone: 'violet' },
  { key: 'Offered', label: 'Offers', tone: 'green' },
  { key: 'Rejected', label: 'Rejected', tone: 'muted' },
];

function MetricCard({ label, value, note, icon: Icon, tone }) {
  return <article className="metric-card"><div className="metric-card-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></div><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span></article>;
}

function PanelHeading({ title, detail }) {
  return <div className="panel-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div><span className="panel-menu" aria-hidden="true">···</span></div>;
}

export default function AnalyticsPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalyticsData();
      if (res.success && res.data) setData(res.data);
      else setError('Analytics data could not be loaded.');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Could not connect to the analytics service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  const pipeline = data?.pipelineBreakdown || {};
  const stagesWithCounts = useMemo(() => stages.map((stage) => ({ ...stage, count: pipeline[stage.key] || 0 })), [pipeline]);
  const maxStage = Math.max(1, ...stagesWithCounts.map((stage) => stage.count));
  const totalPipeline = Object.values(pipeline).reduce((sum, count) => sum + Number(count || 0), 0);
  const topSkills = data?.topSkills || [];
  const maxSkill = Math.max(1, ...topSkills.map((skill) => skill.count || 0));

  return <div className="dashboard-page">
    <header className="page-header dashboard-header">
      <div><div className="eyebrow">TALENT OPERATIONS <span /> LIVE OVERVIEW</div><h1 className="page-title">Overview</h1><p className="page-subtitle">Recruitment performance at a glance.</p></div>
      <button className="refresh-button" onClick={fetchAnalytics} disabled={loading}><RefreshCw size={15} className={loading ? 'spin-icon' : ''} /> Refresh</button>
    </header>

    {error && <div className="dashboard-error" role="alert"><span>{error}</span><button onClick={fetchAnalytics}>Try again</button></div>}

    <section className="metric-grid" aria-label="Recruitment metrics">
      <MetricCard label="TOTAL CANDIDATES" value={loading ? '—' : (data?.totalCandidates ?? 0).toLocaleString()} note="Across your talent pipeline" icon={FileUser} tone="blue" />
      <MetricCard label="JOB POSTINGS" value={loading ? '—' : (data?.totalJobs ?? 0).toLocaleString()} note="Roles in your workspace" icon={BriefcaseBusiness} tone="cyan" />
      <MetricCard label="INTERVIEWS" value={loading ? '—' : (pipeline.Interview || 0).toLocaleString()} note="Candidates in interview stage" icon={Clock3} tone="violet" />
      <MetricCard label="VIDEO INTERVIEWS" value={loading ? '—' : (data?.totalVideoInterviews ?? 0).toLocaleString()} note="Video interview requests" icon={Video} tone="green" />
    </section>

    <section className="dashboard-grid dashboard-grid-primary">
      <article className="dashboard-panel funnel-panel">
        <PanelHeading title="Recruitment funnel" detail={`${totalPipeline.toLocaleString()} candidates across all stages`} />
        {loading ? <div className="panel-loading">Loading pipeline…</div> : totalPipeline === 0 ? <div className="empty-panel"><span className="empty-icon"><FileUser size={18} /></span><strong>Your pipeline is ready</strong><p>Upload resumes to see candidates move through each recruitment stage.</p></div> : <div className="funnel-list">
          {stagesWithCounts.map((stage) => <div className="funnel-row" key={stage.key}><div className="funnel-label"><span>{stage.label}</span><strong>{stage.count.toLocaleString()}</strong></div><div className="funnel-track"><span className={`funnel-fill ${stage.tone}`} style={{ width: `${Math.max(stage.count ? 5 : 0, (stage.count / maxStage) * 100)}%` }} /></div></div>)}
        </div>}
        <div className="funnel-footnote"><span><CheckCircle2 size={14} /> Pipeline stages update from candidate records</span><button onClick={() => onNavigate?.('match')}>View candidates <ArrowUpRight size={14} /></button></div>
      </article>

      <article className="dashboard-panel skills-panel">
        <PanelHeading title="Top candidate skills" detail="Most common skills from parsed resumes" />
        {loading ? <div className="panel-loading">Loading skills…</div> : topSkills.length === 0 ? <div className="empty-panel"><span className="empty-icon"><FileUser size={18} /></span><strong>No skills yet</strong><p>Skills extracted from uploaded resumes will appear here.</p></div> : <div className="skills-list">{topSkills.slice(0, 6).map((skill, index) => <div className="skill-row" key={skill.skill}><span className="skill-rank">{String(index + 1).padStart(2, '0')}</span><span className="skill-name">{skill.skill}</span><span className="skill-bar-track"><span style={{ width: `${(skill.count / maxSkill) * 100}%` }} /></span><strong>{skill.count}</strong></div>)}</div>}
        <div className="funnel-footnote"><span>Extracted from candidate resumes</span><span className="skill-legend"><i /> Skill mentions</span></div>
      </article>
    </section>

    <section className="dashboard-grid dashboard-grid-secondary">
      <article className="dashboard-panel recent-panel">
        <PanelHeading title="Recent candidates" detail="Latest additions to your talent pool" />
        {loading ? <div className="panel-loading">Loading candidates…</div> : !data?.recentCandidates?.length ? <div className="empty-panel compact"><strong>No candidates to show</strong><p>New resume uploads will show up here.</p></div> : <div className="table-scroll"><table className="dashboard-table"><thead><tr><th>Candidate</th><th>Pipeline stage</th><th>Skills</th></tr></thead><tbody>{data.recentCandidates.map((candidate) => <tr key={candidate.id}><td><div className="candidate-cell"><span className="candidate-avatar">{(candidate.name || '?').slice(0, 1).toUpperCase()}</span><span><strong>{candidate.name || 'Unnamed candidate'}</strong><small>{candidate.email}</small></span></div></td><td><span className={`status-badge status-${(candidate.status || 'Applied').toLowerCase()}`}>{candidate.status || 'Applied'}</span></td><td className="table-muted">{candidate.skillsCount || 0} skills</td></tr>)}</tbody></table></div>}
      </article>
      <article className="dashboard-panel alerts-panel">
        <PanelHeading title="System alerts" detail="Hiring workspace status" />
        <div className="system-status muted-status"><span className="system-status-icon"><ArrowDownRight size={17} /></span><span><strong>No alert feed connected</strong><small>Connect a monitoring source to view screening alerts and model drift.</small></span></div>
        <div className="system-status muted-status"><span className="system-status-icon"><Clock3 size={17} /></span><span><strong>Monitoring data unavailable</strong><small>This workspace does not currently provide system alert metrics.</small></span></div>
        <div className="alerts-footer"><span className="status-pulse" /> Waiting for monitoring data</div>
      </article>
    </section>
  </div>;
}
