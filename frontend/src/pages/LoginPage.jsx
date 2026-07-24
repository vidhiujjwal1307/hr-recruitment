import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import apiClient from '../api/client';

export default function LoginPage({ onLogin }) {
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');

    try {
      const response = await apiClient.post('/auth/google', { credential: credentialResponse.credential });
      const { token, user } = response.data;

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in with Google. Please try again.');
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem', background: 'var(--bg-primary)' }}>
      <section className="card" style={{ width: 'min(100%, 420px)', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ marginTop: 0 }}>Welcome to RecruitAI</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Sign in to manage resumes, jobs, and interviews.</p>
        {clientId ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google sign-in was cancelled or unavailable.')} />
          </div>
        ) : (
          <p style={{ color: '#fbbf24' }}>Google login is not configured. Set VITE_GOOGLE_CLIENT_ID and restart the frontend.</p>
        )}
        {error && <p style={{ color: '#f87171', marginTop: '1rem' }}>{error}</p>}
      </section>
    </main>
  );
}
