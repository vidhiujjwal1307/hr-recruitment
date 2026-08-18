import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import apiClient from '../api/client';

const fieldStyle = {
  width: '100%',
  padding: '0.75rem',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  background: 'rgba(255, 255, 255, 0.04)',
  color: 'var(--text-main)',
  marginTop: '0.35rem',
};

export default function LoginPage({ onLogin, mode = 'login', onNavigate }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isSignup = mode === 'signup';

  const saveSession = ({ token, user }, authProvider) => {
    const sessionUser = { ...user, authProvider };
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(sessionUser));
    onLogin(sessionUser);
  };

  const handleDemoLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      const response = await apiClient.post('/auth/demo');
      saveSession(response.data, 'demo');
    } catch (err) {
      console.error(err);
      setError('Unable to login with demo account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const response = await apiClient.post('/auth/google', { credential: credentialResponse.credential });
      saveSession(response.data, 'google');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in with Google. Please try again.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (isSignup && form.password.length < 8) return setError('Password must be at least 8 characters.');
    if (isSignup && form.password !== form.confirmPassword) return setError('Passwords do not match.');

    setSubmitting(true);
    try {
      const payload = isSignup
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const response = await apiClient.post(`/auth/${isSignup ? 'signup' : 'login'}`, payload);
      saveSession(response.data, 'local');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '1.5rem', background: 'var(--bg-primary)' }}>
      <section className="card" style={{ width: 'min(100%, 440px)', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ marginTop: 0, fontSize: '1.75rem' }}>{isSignup ? 'Create your account' : 'Welcome to RecruitAI'}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {isSignup ? 'Sign up to start managing your recruitment workflow.' : 'Sign in to manage resumes, jobs, analytics, and candidate Q&A.'}
        </p>

        {/* Instant Demo Login Button */}
        <button
          onClick={handleDemoLogin}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.95rem',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '1.25rem',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}
        >
          ⚡ Instant Demo Access (One-Click Login)
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <span style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />or Google / Email<span style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
        </div>

        {clientId ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError(`Google OAuth origin error: Please ensure ${window.location.origin} is added under Authorized JavaScript origins in Google Cloud Console.`)}
            />
          </div>
        ) : (
          <p style={{ color: '#fbbf24', fontSize: '0.85rem' }}>
            Google login is not configured. Set VITE_GOOGLE_CLIENT_ID or click Instant Demo Access.
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0', color: 'var(--text-muted)' }}>
          <span style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />or email<span style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'grid', gap: '1rem' }}>
          {isSignup && <label style={{ fontSize: '0.85rem' }}>Name<input required value={form.name} onChange={updateField('name')} style={fieldStyle} autoComplete="name" /></label>}
          <label style={{ fontSize: '0.85rem' }}>Email<input required type="email" value={form.email} onChange={updateField('email')} style={fieldStyle} autoComplete="email" /></label>
          <label style={{ fontSize: '0.85rem' }}>Password<input required type="password" value={form.password} onChange={updateField('password')} style={fieldStyle} minLength={isSignup ? 8 : undefined} autoComplete={isSignup ? 'new-password' : 'current-password'} /></label>
          {isSignup && <label style={{ fontSize: '0.85rem' }}>Confirm password<input required type="password" value={form.confirmPassword} onChange={updateField('confirmPassword')} style={fieldStyle} minLength={8} autoComplete="new-password" /></label>}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '0.75rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              lineHeight: '1.4',
            }}>
              ⚠️ {error}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isSignup ? 'Sign Up' : 'Log In with Email'}
          </button>
        </form>

        <p style={{ color: 'var(--text-muted)', marginTop: '1.25rem', fontSize: '0.85rem' }}>
          {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
          <button onClick={() => onNavigate(isSignup ? '/login' : '/signup')} style={{ color: '#818cf8', background: 'transparent', padding: 0, border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {isSignup ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </section>
    </main>
  );
}
