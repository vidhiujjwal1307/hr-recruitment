import React, { useState } from 'react';
import Navbar from './components/Navbar';
import UploadResumePage from './pages/UploadResumePage';
import JobPostingPage from './pages/JobPostingPage';
import MatchResultsPage from './pages/MatchResultsPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('authToken')));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  });

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} />
      <main className="app-container">
        {activeTab === 'upload' && <UploadResumePage />}
        {activeTab === 'jobs' && <JobPostingPage />}
        {activeTab === 'match' && <MatchResultsPage />}
      </main>
    </div>
  );
}
