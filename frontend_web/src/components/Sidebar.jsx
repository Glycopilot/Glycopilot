import { useState, useEffect } from 'react';
import authService from '../services/authService';
import { countReceivedInvites } from '../lib/careTeamInvites';
import { devWarn } from '../lib/logger';
import logo from '../assets/glycopilot.png';
import { LayoutDashboard, LogOut, UserCircle, Users } from 'lucide-react';
import { UiMenu, UiClose } from './UiIcon';
import HelpButton from './tour/HelpButton';

const apiClient = authService.getApiClient();

export default function Sidebar({ activePage, navigation }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [receivedInviteCount, setReceivedInviteCount] = useState(0);

  useEffect(() => {
    if (!authService.isAuthenticated()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/doctors/care-team/my-team/');
        if (cancelled) return;
        const count = res.data.pending_received_count
          ?? countReceivedInvites(res.data.pending_invites, res.data.active_patients);
        setReceivedInviteCount(count);
      } catch {
        if (!cancelled) setReceivedInviteCount(0);
      }
    })();
    return () => { cancelled = true; };
  }, [activePage]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 860) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout/');
    } catch (err) {
      devWarn('Logout API warning:', err?.response?.status);
    } finally {
      authService.logout();
      navigation.navigate('/login');
    }
  };

  const navigate = (path) => {
    setMobileOpen(false);
    navigation.navigate(path);
  };

  const navIcon = { size: 18, strokeWidth: 2, 'aria-hidden': true };
  const links = [
    { id: 'home',     label: 'Dashboard',    icon: <LayoutDashboard {...navIcon} />, path: '/home' },
    { id: 'patients', label: 'Mes patients', icon: <Users {...navIcon} />,           path: '/patients' },
    { id: 'profile',  label: 'Mon profil',   icon: <UserCircle {...navIcon} />,      path: '/profile' },
  ];

  const SidebarNav = () => (
    <>
      <nav className="sb-nav">
        {links.map(l => (
          <button
            key={l.id}
            type="button"
            className={`sb-item ${activePage === l.id ? 'sb-active' : ''}`}
            onClick={() => navigate(l.path)}
          >
            {l.icon}
            <span>{l.label}</span>
            {l.id === 'patients' && receivedInviteCount > 0 && (
              <span className="sb-badge" aria-label={`${receivedInviteCount} demande(s) reçue(s)`}>
                {receivedInviteCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="sb-footer">
        <HelpButton />
        <button type="button" className="sb-logout" onClick={handleLogout} title="Se déconnecter">
          <LogOut size={18} strokeWidth={2} aria-hidden />
          <span>Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="sidebar sidebar-desktop" aria-label="Navigation principale">
        <div className="sb-logo">
          <img src={logo} alt="GlycoPilot" />
        </div>
        <SidebarNav />
      </aside>

      <header className="mobile-topbar" aria-label="Barre de navigation mobile">
        <img src={logo} alt="GlycoPilot" className="mobile-topbar-logo" />
        <button
          type="button"
          className="hamburger-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          aria-expanded={mobileOpen}
        >
          <UiMenu size={22} />
        </button>
      </header>

      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar sidebar-mobile ${mobileOpen ? 'sidebar-mobile-open' : ''}`}
        aria-label="Menu"
        aria-hidden={!mobileOpen}
      >
        <div className="sb-mobile-header">
          <div className="sb-mobile-brand">
            <img src={logo} alt="GlycoPilot" className="sb-mobile-drawer-logo" />
          </div>
          <button
            type="button"
            className="sb-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Fermer le menu"
          >
            <UiClose size={22} />
          </button>
        </div>
        <div className="sb-mobile-body">
          <SidebarNav />
        </div>
      </aside>
    </>
  );
}
