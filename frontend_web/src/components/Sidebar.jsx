import { LayoutDashboard, Users, User, LogOut } from 'lucide-react';
import authService from '../services/authService';
import './css/sidebar.css';

function getInitials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

export default function Sidebar({ activePage, navigation }) {
  const stored = authService.getStoredUser();

  // Compatibilité avec l'ancien format (à plat) et le nouveau format imbriqué (/auth/me/)
  const firstName = stored?.first_name ?? stored?.identity?.first_name;
  const lastName  = stored?.last_name  ?? stored?.identity?.last_name;

  const handleLogout = async () => {
    await authService.logout();
    navigation.navigate('/login');
  };

  const links = [
    { id: 'home',     label: 'Dashboard',   icon: <LayoutDashboard size={18} />, path: '/home' },
    { id: 'patients', label: 'Mes patients', icon: <Users size={18} />,           path: '/patients' },
    { id: 'profile',  label: 'Mon profil',   icon: <User size={18} />,            path: '/profile' },
  ];

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <img src="../assets/glycopilot.png" alt="GlycoPilot" />
      </div>

      <nav className="sb-nav">
        {links.map(l => (
          <button
            key={l.id}
            className={`sb-item ${activePage === l.id ? 'sb-active' : ''}`}
            onClick={() => navigation.navigate(l.path)}
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
            <span className="sb-doc-name">
              Dr. {lastName}
            </span>
          </div>
        </div>
        <button className="sb-logout" onClick={handleLogout} title="Se déconnecter">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}