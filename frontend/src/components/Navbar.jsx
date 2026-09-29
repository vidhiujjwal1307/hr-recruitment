import React, { useState } from 'react';
import { Activity, BriefcaseBusiness, CalendarDays, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, Search, Settings2, UserRound, Users, X, Bell } from 'lucide-react';

const navigation = [
  { id: 'analytics', label: 'Overview', icon: LayoutDashboard, group: 'Recruitment' },
  { id: 'match', label: 'Candidates', icon: Users, group: 'Recruitment' },
  { id: 'assessments', label: 'Assessments', icon: FileText, group: 'Recruitment' },
  { id: 'interviews', label: 'Interviews', icon: CalendarDays, group: 'Recruitment' },
  { id: 'upload', label: 'Resume intake', icon: FileText, group: 'Recruitment' },
  { id: 'jobs', label: 'Job postings', icon: BriefcaseBusiness, group: 'Recruitment' },
];

export default function Navbar({ activeTab, setActiveTab, user, onLogout, onProfile, isProfile, onNavigate, onSearch, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const displayName = user?.name || user?.email?.split('@')[0] || 'Recruiter';
  const initials = displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  const handleNavClick = (itemId) => {
    setActiveTab(itemId);
    setMenuOpen(false);
    if (onNavigate) onNavigate('/');
  };

  const goProfile = () => {
    setMenuOpen(false);
    setProfileOpen(false);
    onProfile?.();
  };

  return (
    <>
      <aside className={`app-sidebar${menuOpen ? ' app-sidebar-open' : ''}`}>
        <button className="brand-lockup" onClick={() => handleNavClick('analytics')} aria-label="HireSight overview">
          <span className="brand-mark"><Activity size={17} strokeWidth={2.4} /></span>
          <span className="brand-copy"><strong>HireSight</strong><small>ENTERPRISE</small></span>
        </button>

        <div className="sidebar-workspace"><span className="workspace-dot" /> Talent workspace <ChevronDown size={14} /></div>
        <div className="sidebar-section-label">RECRUITMENT</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`sidebar-link${!isProfile && activeTab === id ? ' active' : ''}`} onClick={() => handleNavClick(id)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
              {id === 'match' && <span className="nav-link-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-section-label sidebar-admin-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <button className={`sidebar-link${isProfile ? ' active' : ''}`} onClick={goProfile}><Settings2 size={17} strokeWidth={1.8} /><span>Profile & settings</span></button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-user">
          {user?.picture ? <img className="avatar" src={user.picture} alt="" /> : <span className="avatar avatar-initials">{initials}</span>}
          <span className="sidebar-user-copy"><strong>{displayName}</strong><small>{user?.role || 'Recruiter'}</small></span>
          <button className="icon-button sidebar-logout" onClick={onLogout} title="Log out" aria-label="Log out"><LogOut size={16} /></button>
        </div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <div className="app-main-column">
        <header className="app-topbar">
          <button className="mobile-menu-button icon-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <form className="global-search" onSubmit={(event) => { event.preventDefault(); onSearch?.(searchText); }}><Search size={16} /><input aria-label="Search candidates and roles" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search candidates, roles..." /><kbd>Enter</kbd></form>
          <div className="topbar-actions">
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><span /></button>
            <div className="profile-menu-wrap">
              <button className="topbar-profile" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
                {user?.picture ? <img className="avatar" src={user.picture} alt="" /> : <span className="avatar avatar-initials">{initials}</span>}
                <span className="topbar-profile-name">{displayName}</span><ChevronDown size={14} />
              </button>
              {profileOpen && <div className="profile-dropdown"><button onClick={goProfile}><UserRound size={15} /> Profile settings</button><button onClick={onLogout}><LogOut size={15} /> Log out</button></div>}
            </div>
          </div>
        </header>
        {children}
      </div>
    </>
  );
}
