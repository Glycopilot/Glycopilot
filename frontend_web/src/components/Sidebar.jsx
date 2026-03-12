import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, User, LogOut, Menu, X } from 'lucide-react';
import authService from '../services/authService';
import logo from '../assets/glycopilot.png';

const apiClient = authService.getApiClient();

function getInitials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

export default function Sidebar({ activePage, navigation }) {
  const stored = authService.getStoredUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const firstName = stored?.first_name ?? stored?.identity?.first_name;
  const lastName  = stored?.last_name  ?? stored?.identity?.last_name;

  // Ferme le menu si on redimensionne vers desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 860) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Bloque le scroll du body quand le menu est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout/');
    } catch (err) {
      console.warn('Logout API warning:', err?.response?.status);
    } finally {
      authService.logout();
      navigation.navigate('/login');
    }
  };

  const navigate = (path) => {
    setMobileOpen(false);
    navigation.navigate(path);
  };

  const links = [
    { id: 'home',     label: 'Dashboard',   icon: <LayoutDashboard size={18} />, path: '/home' },
    { id: 'patients', label: 'Mes patients', icon: <Users size={18} />,           path: '/patients' },
    { id: 'profile',  label: 'Mon profil',   icon: <User size={18} />,            path: '/profile' },
  ];

  const SidebarContent = () => (
    <>
      <div className="sb-logo">
        <img src={logo} alt="GlycoPilot" />
      </div>

      <nav className="sb-nav">
        {links.map(l => (
          <button
            key={l.id}
            className={`sb-item ${activePage === l.id ? 'sb-active' : ''}`}
            onClick={() => navigate(l.path)}
          >
            {l.icon}
            <span>{l.label}</span>
          </button>
        ))}
      </nav>

      <div className="sb-footer">
        <div className="sb-doctor">
          <div className="sb-avatar">{getInitials(firstName, lastName)}</div>
          <div className="sb-doc-text">
            <span className="sb-doc-name">Dr. {lastName}</span>
            <span className="sb-doc-role">Médecin</span>
          </div>
        </div>
        <button className="sb-logout" onClick={handleLogout} title="Se déconnecter">
          <LogOut size={16} />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="sidebar sidebar-desktop">
        <SidebarContent />
      </aside>

      {/* ── Mobile topbar ── */}
      <div className="mobile-topbar">
        <img src={logo} alt="GlycoPilot" className="mobile-logo" />
        <button className="hamburger-btn" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
          <Menu size={22} />
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={`sidebar sidebar-mobile ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <button className="sb-close" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
          <X size={20} />
        </button>
        <SidebarContent />
      </aside>
    </>
  );
}