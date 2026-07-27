import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import UploadResumePage from './pages/UploadResumePage';
import JobPostingPage from './pages/JobPostingPage';
import MatchResultsPage from './pages/MatchResultsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import VideoInterviewPage from './pages/VideoInterviewPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [route, setRoute] = useState(() => window.location.pathname);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('authToken')));
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } });

  useEffect(() => {
    const handlePopState = () => setRoute(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setRoute(path);
  };
  const handleLogin = (loggedInUser) => { setUser(loggedInUser); setIsAuthenticated(true); navigate('/'); };
  const handleLogout = () => { localStorage.removeItem('authToken'); localStorage.removeItem('user'); setUser(null); setIsAuthenticated(false); navigate('/login'); };
  const publicInterviewToken = route.startsWith('/video-interview/') ? route.split('/')[2] : '';

  if (publicInterviewToken) return <VideoInterviewPage token={publicInterviewToken} />;
  if (!isAuthenticated) return <LoginPage onLogin={handleLogin} mode={route === '/signup' ? 'signup' : 'login'} onNavigate={navigate} />;

  return <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
    <Navbar activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout} onProfile={() => navigate('/profile')} isProfile={route === '/profile'} />
    <main className="app-container">
      {route === '/profile' ? <ProfilePage user={user} onLogout={handleLogout} /> : <>
        {activeTab === 'upload' && <UploadResumePage />}
        {activeTab === 'jobs' && <JobPostingPage />}
        {activeTab === 'match' && <MatchResultsPage />}
      </>}
    </main>
  </div>;
}
