import React, { useState } from 'react';
import Navbar from './components/Navbar';
import UploadResumePage from './pages/UploadResumePage';
import JobPostingPage from './pages/JobPostingPage';
import MatchResultsPage from './pages/MatchResultsPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="app-container">
        {activeTab === 'upload' && <UploadResumePage />}
        {activeTab === 'jobs' && <JobPostingPage />}
        {activeTab === 'match' && <MatchResultsPage />}
      </main>
    </div>
  );
}
