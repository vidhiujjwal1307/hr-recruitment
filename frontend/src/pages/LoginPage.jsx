import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Activity } from 'lucide-react';
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
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '757996309729-i5pjlrbk43b31g1m3mroc07l3c5t5rt9.apps.googleusercontent.com';
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
      setError(err.response?.data?.message || err.message || 'Unable to login with demo account.');
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
      console.error('Google login API error:', requestError);
      setError(requestError.response?.data?.message || requestError.message || 'Unable to sign in with Google. Please try again.');
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
      console.error('Auth submit API error:', requestError);
      setError(requestError.response?.data?.message || requestError.message || 'Unable to sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
  <main className="login-page">

    {/* Background glow */}
    <div className="login-glow login-glow-one"></div>
    <div className="login-glow login-glow-two"></div>

    <section className="login-container">

      {/* ================= APP BRAND ================= */}
      <div className="login-brand">
        <div className="brand-logo" aria-hidden="true"><Activity size={22} strokeWidth={2.2} /></div>

        <div className="brand-info">
          <h1>HireSight</h1>
          <p>Smarter Hiring, Better Decisions</p>
        </div>
      </div>

      {/* ================= LOGIN CARD ================= */}
      <div className="login-card">

        <div className="login-header">
          <h2>{isSignup ? 'Create Account' : 'Sign In'}</h2>

<p>
  {isSignup
    ? 'Create your account to start hiring smarter'
    : 'Access your recruitment dashboard'}
</p>
        </div>
        {isSignup && (
  <label>
    Name

    <input
      required
      type="text"
      value={form.name}
      onChange={updateField('name')}
      placeholder="Your name"
      autoComplete="name"
    />
  </label>
)}

        {/* ================= EMAIL LOGIN ================= */}
        <form onSubmit={handleSubmit} className="login-form">

          <label>
            Email

            <input
              required
              type="email"
              value={form.email}
              onChange={updateField('email')}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label>
            Password

            <input
              required
              type="password"
              value={form.password}
              onChange={updateField('password')}
              placeholder="Enter your password"
              autoComplete="current-password"
              minLength={isSignup ? 8 : undefined}
            />
          </label>
          {isSignup && (
  <label>
    Confirm Password

    <input
      required
      type="password"
      value={form.confirmPassword}
      onChange={updateField('confirmPassword')}
      placeholder="Confirm your password"
      autoComplete="new-password"
    />
  </label>
)}

          {/* Error message */}
          {error && (
            <div className="login-error">
              ⚠️ {error}
            </div>
          )}

          <button
            className="login-submit"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in...' : 'Log In →'}
          </button>

        </form>

        {/* ================= DIVIDER ================= */}
        <div className="login-divider">
          <span></span>
          <p>OR</p>
          <span></span>
        </div>

        {/* ================= GOOGLE LOGIN ================= */}
        <div className="google-section">

          {clientId ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() =>
                setError(
                  `Google OAuth origin error: Please ensure ${window.location.origin} is added under Authorized JavaScript origins in Google Cloud Console.`
                )
              }
            />
          ) : (
            <p className="google-disabled">
              Google login is not configured.
            </p>
          )}

        </div>

        {/* ================= SIGN UP ================= */}
        <div className="signup-text">
  {isSignup ? 'Already have an account?' : 'New to HireSight?'}

  <button
    type="button"
    onClick={() => onNavigate(isSignup ? '/login' : '/signup')}
  >
    {isSignup ? 'Log In' : 'Sign Up'}
  </button>
</div>

      </div>
    </section>
  </main>
);
}
