import { useEffect, useMemo } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import LoginScreen from './screens/LoginScreen';
import SignInScreen from './screens/SignInScreen';
import HomeScreen from './screens/HomeScreen';
import PatientsScreen from './screens/PatientsScreen';
import ProfileScreen from './screens/ProfileScreen';
import authService from './services/authService';
import ErrorBoundary from './components/ErrorBoundary';
import Tour from './components/tour/Tour';
import { TourProvider } from './components/tour/TourProvider';
import { registerAuthRedirect } from './lib/auth-redirect';
import { TourProvider } from './components/tour/TourProvider';
import Tour from './components/tour/Tour';
import './styles/tokens.css';
import './styles/polish.css';
import './components/css/sidebar.css';
import './App.css';

function RequireAuth({ children }) {
  const location = useLocation();
  const redirectToLogin = (extraState) => (
    <Navigate to="/login" replace state={{ from: location, ...extraState }} />
  );

  if (!authService.isAuthenticated()) return redirectToLogin();

  // Garde-fou : un compte non-médecin (ex. patient) ne doit pas accéder à
  // l'espace médecin, même s'il a réussi à poser un access_token côté navigateur.
  if (!authService.isDoctor()) {
    authService.logout();
    return redirectToLogin({ reason: 'role' });
  }
  return children;
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useMemo(() => ({ navigate: (path) => navigate(path) }), [navigate]);

  useEffect(() => {
    registerAuthRedirect(() => navigate('/login', { replace: true }));
  }, [navigate]);

  return (
    <div key={location.pathname} className="route-shell">
      <Routes location={location}>
        <Route
          path="/"
          element={<Navigate to={authService.isAuthenticated() ? '/home' : '/login'} replace />}
        />
        <Route path="/login"  element={<LoginScreen  navigation={navigation} />} />
        <Route path="/signin" element={<SignInScreen navigation={navigation} />} />
        <Route
          path="/home"
          element={
            <RequireAuth>
              <HomeScreen navigation={navigation} />
            </RequireAuth>
          }
        />
        <Route
          path="/patients"
          element={
            <RequireAuth>
              <PatientsScreen navigation={navigation} />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfileScreen navigation={navigation} />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <BrowserRouter>
        <TourProvider>
          <div className="App">
            <AppRoutes />
            <Tour />
          </div>
        </TourProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
