import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import apiClient from '../api/client';

const fieldStyle = {
  width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
  background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-main)', marginTop: '0.35rem',
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
      <section className="card" style={{ width: 'min(100%, 420px)', textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ marginTop: 0 }}>{isSignup ? 'Create your account' : 'Welcome to RecruitAI'}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          {isSignup ? 'Sign up to start managing your recruitment workflow.' : 'Sign in to manage resumes, jobs, and interviews.'}
        </p>
        {clientId ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google sign-in was cancelled or unavailable.')} />
          </div>
        ) : <p style={{ color: '#fbbf24' }}>Google login is not configured. Set VITE_GOOGLE_CLIENT_ID and restart the frontend.</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0', color: 'var(--text-muted)' }}>
          <span style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />or<span style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'grid', gap: '1rem' }}>
          {isSignup && <label>Name<input required value={form.name} onChange={updateField('name')} style={fieldStyle} autoComplete="name" /></label>}
          <label>Email<input required type="email" value={form.email} onChange={updateField('email')} style={fieldStyle} autoComplete="email" /></label>
          <label>Password<input required type="password" value={form.password} onChange={updateField('password')} style={fieldStyle} minLength={isSignup ? 8 : undefined} autoComplete={isSignup ? 'new-password' : 'current-password'} /></label>
          {isSignup && <label>Confirm password<input required type="password" value={form.confirmPassword} onChange={updateField('confirmPassword')} style={fieldStyle} minLength={8} autoComplete="new-password" /></label>}
          {error && <p role="alert" style={{ color: '#f87171', margin: 0 }}>{error}</p>}
          <button className="btn-primary" type="submit" disabled={submitting}>{submitting ? 'Please wait…' : isSignup ? 'Sign Up' : 'Log In'}</button>
        </form>
        <p style={{ color: 'var(--text-muted)', marginTop: '1.25rem' }}>
          {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
          <button onClick={() => onNavigate(isSignup ? '/login' : '/signup')} style={{ color: '#818cf8', background: 'transparent', padding: 0 }}>
            {isSignup ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </section>
    </main>
  );
}
