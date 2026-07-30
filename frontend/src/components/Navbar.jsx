import React from 'react';

export default function Navbar({ activeTab, setActiveTab, user, onLogout, onProfile, isProfile, onNavigate }) {
  const navItems = [
    { id: 'analytics', label: '📊 Analytics' },
    { id: 'upload', label: 'Upload Resumes' },
    { id: 'jobs', label: 'Job Postings' },
    { id: 'match', label: 'AI Match & Pipeline' },
  ];

  const handleNavClick = (itemId) => {
    setActiveTab(itemId);
    if (onNavigate) {
      onNavigate('/');
    }
  };

  return (
    <nav style={{
      background: 'rgba(18, 24, 36, 0.8)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '1rem 2rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div
        onClick={() => handleNavClick('analytics')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          color: '#fff',
          fontSize: '1.2rem',
        }}>
          HR
        </div>
        <span style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
        }}>
          Recruit<span style={{ color: '#6366f1' }}>AI</span>
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: !isProfile && activeTab === item.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: !isProfile && activeTab === item.id ? '#818cf8' : '#9ca3af',
              border: !isProfile && activeTab === item.id ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
              fontWeight: 500,
              fontSize: '0.9rem',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}

        <button
          onClick={onProfile}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            background: isProfile ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: isProfile ? '#818cf8' : '#9ca3af',
            border: isProfile ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Profile
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.75rem' }}>
          {user?.picture && (
            <img src={user.picture} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <span style={{ color: '#d1d5db', fontSize: '0.875rem' }}>{user?.name || user?.email}</span>
          <button
            onClick={onLogout}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'transparent',
              color: '#d1d5db',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
