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
import { registerAuthRedirect } from './lib/auth-redirect';
import './styles/tokens.css';
import './styles/polish.css';
import './components/css/sidebar.css';
import './App.css';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
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
        <div className="App">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
