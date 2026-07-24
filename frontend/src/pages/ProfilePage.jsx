import { useState } from 'react';
import apiClient from '../api/client';

const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-main)', marginTop: '0.35rem' };

export default function ProfilePage({ user, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isLocalUser = user?.authProvider === 'local';

  const changePassword = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    setSaving(true);
    try {
      const response = await apiClient.put('/auth/change-password', { currentPassword, newPassword });
      setMessage(response.data.message); setCurrentPassword(''); setNewPassword('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to change password.');
    } finally { setSaving(false); }
  };

  return <div style={{ maxWidth: '640px', margin: '0 auto' }}>
    <header className="page-header"><h1 className="page-title">Profile</h1><p className="page-subtitle">Your account details and sign-in settings.</p></header>
    <section className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
      {user?.picture ? <img src={user.picture} alt="Profile" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} /> : <div aria-label="Default profile avatar" style={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--accent-gradient)', fontSize: '1.5rem', fontWeight: 700 }}>{(user?.name || user?.email || '?').charAt(0).toUpperCase()}</div>}
      <div><h2 style={{ margin: 0 }}>{user?.name || 'RecruitAI user'}</h2><p style={{ color: 'var(--text-muted)' }}>{user?.email}</p><p style={{ color: '#a5b4fc', marginTop: '0.5rem' }}>Sign-in method: {isLocalUser ? 'Email' : 'Google'}</p></div>
    </section>
    {isLocalUser && <section className="card" style={{ marginTop: '1.5rem' }}>
      <h2 style={{ marginTop: 0 }}>Change Password</h2>
      <form onSubmit={changePassword} style={{ display: 'grid', gap: '1rem' }}>
        <label>Current password<input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} style={inputStyle} autoComplete="current-password" /></label>
        <label>New password<input required type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} style={inputStyle} autoComplete="new-password" /></label>
        {error && <p role="alert" style={{ color: '#f87171' }}>{error}</p>}{message && <p style={{ color: '#86efac' }}>{message}</p>}
        <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Change Password'}</button>
      </form>
    </section>}
    <button onClick={onLogout} style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(248, 113, 113, .6)', color: '#f87171' }}>Log Out</button>
  </div>;
}
