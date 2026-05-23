import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './doctor-layout.css';

export default function DoctorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useMemo(() => ({ navigate: (path) => navigate(path) }), [navigate]);

  const activePage = location.pathname.startsWith('/patients')
    ? 'patients'
    : location.pathname.startsWith('/profile')
      ? 'profile'
      : 'home';

  return (
    <div className="doctor-shell">
      <Sidebar activePage={activePage} navigation={navigation} />
      <div className="doctor-shell-main">
        <Outlet context={{ navigation }} />
      </div>
    </div>
  );
}
