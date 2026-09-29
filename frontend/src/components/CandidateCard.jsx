import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, FileText, MoreHorizontal, Sparkles, UserRound, X } from 'lucide-react';
import { deleteCandidate, updateCandidateStatus } from '../api/client';

const stages = ['Applied', 'Screened', 'Interview', 'Offered', 'Rejected'];
const normalizeSkill = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export default function CandidateCard({ candidate, selectedJobId, selectedJobRequirements = [], matchData, onAnalyzeMatch, onOpenQA, onStatusUpdated, onCandidateDeleted }) {
  const [showResume, setShowResume] = useState(false);
  const [showMatch, setShowMatch] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(candidate.status || 'Applied');
  const candidateId = candidate._id || candidate.id;
  const currentMatch = matchData?.[candidateId];

  const { matchedSkills, otherRelevantSkills, missingSkills } = useMemo(() => {
    const skills = candidate.skills || [];
    const requirements = selectedJobRequirements || [];
    if (!requirements.length) return { matchedSkills: skills.slice(0, 5), otherRelevantSkills: Math.max(0, skills.length - 5), missingSkills: [] };
    const matched = requirements.filter((requirement) => {
      const target = normalizeSkill(requirement);
      return skills.some((skill) => {
        const value = normalizeSkill(skill);
        return value === target || (Math.min(value.length, target.length) >= 4 && (value.includes(target) || target.includes(value)));
      });
    });
    const matchedNames = new Set(matched.map(normalizeSkill));
    const remaining = skills.filter((skill) => !requirements.some((requirement) => {
      const value = normalizeSkill(skill); const target = normalizeSkill(requirement);
      return value === target || (Math.min(value.length, target.length) >= 4 && (value.includes(target) || target.includes(value)));
    }));
    return { matchedSkills: matched.slice(0, 5), otherRelevantSkills: Math.max(0, matched.length - 5), missingSkills: requirements.filter((item) => !matchedNames.has(normalizeSkill(item))) };
  }, [candidate.skills, selectedJobRequirements]);

  const handleStatusChange = async (event) => {
    const next = event.target.value;
    const previous = currentStatus;
    setCurrentStatus(next);
    setUpdatingStatus(true);
    try { await updateCandidateStatus(candidateId, next); onStatusUpdated?.(candidateId, next); }
    catch (error) { setCurrentStatus(previous); window.alert(error.response?.data?.message || 'Could not update candidate stage.'); }
    finally { setUpdatingStatus(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${candidate.name} from the candidate database?`)) return;
    setDeleting(true);
    try { await deleteCandidate(candidateId); onCandidateDeleted?.(candidateId); }
    catch (error) { window.alert(error.response?.data?.message || 'Could not delete candidate.'); setDeleting(false); }
  };

  const openMatch = async () => {
    if (!selectedJobId) { window.alert('Select a job posting to view a match breakdown.'); return; }
    if (!currentMatch && onAnalyzeMatch) {
      setLoadingMatch(true);
      try { await onAnalyzeMatch(candidate, selectedJobId); } finally { setLoadingMatch(false); }
    }
    setShowMatch(true);
  };

  const score = currentMatch?.matchScore;
  const experience = Array.isArray(candidate.experience) ? candidate.experience : [];

  return <>
    <article className="candidate-card">
      <div className="candidate-card-header">
        <span className="candidate-avatar candidate-card-avatar">{candidate.name?.slice(0, 1)?.toUpperCase() || <UserRound size={17} />}</span>
        <div className="candidate-identity"><h3>{candidate.name || 'Unnamed candidate'}</h3><p>{candidate.email || 'No email provided'}</p></div>
        <div className="candidate-card-match">
          <button className={`match-score-compact${score == null ? ' score-empty' : ''}`} onClick={openMatch} disabled={loadingMatch}>
            <span>MATCH SCORE</span><strong>{loadingMatch ? '…' : score == null ? '—' : `${score}%`}</strong><small>{score == null ? 'View breakdown' : score >= 75 ? 'Strong match' : score >= 50 ? 'Potential match' : 'Low match'}</small>
          </button>
        </div>
      </div>

      <div className="candidate-card-meta">
        <span className={`status-badge status-${currentStatus.toLowerCase()}`}>{currentStatus === 'Screened' ? 'Screening' : currentStatus}</span>
        {selectedJobId && <span className="candidate-role-context">Compared with selected job</span>}
      </div>

      <section className="candidate-key-skills">
        <div className="candidate-section-label">{selectedJobRequirements.length ? 'KEY MATCHING SKILLS' : 'KEY SKILLS'}</div>
        {matchedSkills.length ? <div className="candidate-skill-chips">{matchedSkills.map((skill) => <span className="candidate-skill-chip matched" key={skill}><Check size={12} />{skill}</span>)}{otherRelevantSkills > 0 && <span className="candidate-skill-extra">+{otherRelevantSkills} other matches</span>}</div> : <p className="candidate-skill-empty">{selectedJobRequirements.length ? 'No required skills found in this resume.' : 'No extracted skills available.'}</p>}
      </section>

      <div className="candidate-card-footer">
        <div className="candidate-primary-actions"><button className="candidate-action-button" onClick={() => setShowResume(true)}><FileText size={14} /> View resume</button><button className="candidate-action-button primary-text" onClick={openMatch}><Sparkles size={14} /> View match</button></div>
        <div className="candidate-stage-control"><label className="sr-only" htmlFor={`stage-${candidateId}`}>Move candidate stage</label><select id={`stage-${candidateId}`} value={currentStatus} onChange={handleStatusChange} disabled={updatingStatus}>{stages.map((stage) => <option key={stage} value={stage}>{stage === 'Screened' ? 'Screening' : stage}</option>)}</select><ChevronDown size={13} /></div>
        <div className="candidate-more-wrap"><button className="candidate-more-button" onClick={() => setMoreOpen(!moreOpen)} aria-label="More candidate actions" aria-expanded={moreOpen}><MoreHorizontal size={18} /></button>{moreOpen && <div className="candidate-more-menu"><button onClick={() => { setMoreOpen(false); onOpenQA?.(candidate); }}>Resume Q&amp;A</button><button className="danger-action" onClick={() => { setMoreOpen(false); handleDelete(); }} disabled={deleting}>{deleting ? 'Removing…' : 'Delete candidate'}</button></div>}</div>
      </div>
    </article>

    {showResume && <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowResume(false); }}><section className="detail-modal resume-modal" role="dialog" aria-modal="true" aria-labelledby={`resume-title-${candidateId}`}><header className="detail-modal-header"><div><span className="eyebrow">CANDIDATE PROFILE</span><h2 id={`resume-title-${candidateId}`}>{candidate.name}</h2><p>{candidate.email}</p></div><button className="icon-button" onClick={() => setShowResume(false)} aria-label="Close resume"><X size={18} /></button></header><div className="resume-detail-grid"><div><span>CONTACT</span><strong>{candidate.email || 'Not provided'}</strong></div><div><span>EXPERIENCE</span><strong>{experience.length ? `${experience.length} role${experience.length === 1 ? '' : 's'} listed` : 'Not specified'}</strong></div><div className="resume-detail-wide"><span>EXPERIENCE HISTORY</span>{experience.length ? experience.map((item, index) => <p key={index}><strong>{item.role || item.title || 'Experience'}</strong>{item.company ? ` · ${item.company}` : ''}{item.duration ? ` · ${item.duration}` : ''}{item.description ? <small>{item.description}</small> : null}</p>) : <p>No structured experience was found in the resume.</p>}</div><div className="resume-detail-wide"><span>RESUME TEXT</span><pre>{candidate.rawText || 'Resume text is not available.'}</pre></div></div></section></div>}

    {showMatch && <div className="detail-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowMatch(false); }}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby={`match-title-${candidateId}`}><header className="detail-modal-header"><div><span className="eyebrow">JOB FIT ANALYSIS</span><h2 id={`match-title-${candidateId}`}>{candidate.name}</h2><p>Match breakdown for the selected role</p></div><button className="icon-button" onClick={() => setShowMatch(false)} aria-label="Close match breakdown"><X size={18} /></button></header><div className="match-detail-score"><strong>{score == null ? '—' : `${score}%`}</strong><span>{score == null ? 'No score available' : score >= 75 ? 'Strong match' : score >= 50 ? 'Potential match' : 'Low match'}</span></div><p className="match-detail-summary">{currentMatch?.summary || 'Run a match analysis to see a detailed explanation.'}</p><div className="match-requirement-list"><div><h3>Matched requirements</h3>{matchedSkills.length ? matchedSkills.map((skill) => <span className="requirement-chip matched" key={skill}><Check size={13} />{skill}</span>) : <p>No direct skill matches found.</p>}</div><div><h3>Missing requirements</h3>{missingSkills.length ? missingSkills.map((skill) => <span className="requirement-chip missing" key={skill}><X size={13} />{skill}</span>) : <p>{selectedJobRequirements.length ? 'All listed requirements appear in the resume.' : 'No requirements listed for this job.'}</p>}</div></div>{currentMatch?.reasons?.length > 0 && <div className="match-reasons"><h3>Analysis notes</h3><ul>{currentMatch.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div>}</section></div>}
  </>;
}
