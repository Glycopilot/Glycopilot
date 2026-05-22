import authService from '../services/authService';
import { getInitials } from '../lib/utils';
export default function DoctorDashboardHeader({ title, subtitle, actions }) {
  const user = authService.getStoredUser() ?? {};
  const firstName = user.first_name ?? user.identity?.first_name ?? '';
  const lastName = user.last_name ?? user.identity?.last_name ?? '';
  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Médecin';

  return (
    <header className="dash-header">
      <div className="dash-header-left">
        <h1>{title}</h1>
        {subtitle ? <p className="dash-header-subtitle">{subtitle}</p> : null}
      </div>
      <div className="dash-header-right">
        {actions ? <div className="dash-header-actions">{actions}</div> : null}
        <div className="dash-header-profile" aria-label="Compte connecté">
          <div className="dash-header-avatar">{getInitials(firstName, lastName)}</div>
          <div className="dash-header-profile-text">
            <span className="dash-header-name">{displayName}</span>
            <span className="dash-header-role">Médecin référent</span>
          </div>
        </div>
      </div>
    </header>
  );
}
