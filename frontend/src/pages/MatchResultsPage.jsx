import React, { useState, useEffect } from 'react';
import { getCandidates, getJobs, matchCandidate, generateQuestions } from '../api/client';
import CandidateCard from '../components/CandidateCard';
import ScheduleModal from './ScheduleModal';

export default function MatchResultsPage() {
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [matchDataMap, setMatchDataMap] = useState({});
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingBatchMatch, setLoadingBatchMatch] = useState(false);
  const [activeScheduleModal, setActiveScheduleModal] = useState(null);

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

  // Sort candidates by match score descending if calculated
  const sortedCandidates = [...candidates].sort((a, b) => {
    const scoreA = matchDataMap[a._id || a.id]?.matchScore || 0;
    const scoreB = matchDataMap[b._id || b.id]?.matchScore || 0;
    return scoreB - scoreA;
  });

  const selectedJob = jobs.find((j) => (j._id || j.id) === selectedJobId);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">AI Candidate Matching & Pool</h1>
        <p className="page-subtitle">Rank candidate applications against active job requisitions using AI matching.</p>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
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
            fontWeight: 500
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

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            Candidate Database ({sortedCandidates.length})
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
            No candidates uploaded yet. Go to the "Upload Resumes" tab to parse candidate resumes.
          </div>
        ) : (
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
              />
            ))}
          </div>
        )}
      </div>

      {activeScheduleModal && (
        <ScheduleModal
          candidate={activeScheduleModal.candidate}
          jobId={selectedJobId}
          questions={activeScheduleModal.questions}
          onClose={() => setActiveScheduleModal(null)}
        />
      )}
    </div>
  );
}
