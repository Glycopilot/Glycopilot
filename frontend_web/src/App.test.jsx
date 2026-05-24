import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

// État mutable pour piloter authService dans chaque test.
const mockState = {
  isAuthenticated: false,
  isDoctor: false,
};
const mockLogout = jest.fn();

jest.mock('./services/authService', () => ({
  __esModule: true,
  default: {
    isAuthenticated: () => mockState.isAuthenticated,
    isDoctor: () => mockState.isDoctor,
    logout: (...args) => mockLogout(...args),
    getApiClient: () => ({ get: jest.fn(), post: jest.fn() }),
    getStoredUser: () => null,
  },
}));

// Stubs des écrans protégés pour isoler RequireAuth sans tirer toutes les
// dépendances (Sidebar, axios, etc.).
jest.mock('./screens/HomeScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="home-screen">HOME</div>,
}));
jest.mock('./screens/PatientsScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="patients-screen">PATIENTS</div>,
}));
jest.mock('./screens/ProfileScreen', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-screen">PROFILE</div>,
}));

beforeEach(() => {
  window.history.pushState({}, '', '/');
  mockState.isAuthenticated = false;
  mockState.isDoctor = false;
  mockLogout.mockClear();
});

test('renders the login screen at startup when not authenticated', async () => {
  render(<App />);
  await waitFor(() =>
    expect(screen.getAllByText(/connexion/i).length).toBeGreaterThanOrEqual(1)
  );
});

test('RequireAuth : authenticated + doctor → rend les enfants protégés', async () => {
  mockState.isAuthenticated = true;
  mockState.isDoctor = true;
  window.history.pushState({}, '', '/home');
  render(<App />);
  await waitFor(() =>
    expect(screen.getByTestId('home-screen')).toBeInTheDocument()
  );
  expect(mockLogout).not.toHaveBeenCalled();
});

test('RequireAuth : authenticated mais rôle non-médecin → logout + redirection vers /login', async () => {
  mockState.isAuthenticated = true;
  mockState.isDoctor = false;
  window.history.pushState({}, '', '/home');
  render(<App />);
  await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  await waitFor(() =>
    expect(screen.getAllByText(/connexion/i).length).toBeGreaterThanOrEqual(1)
  );
  expect(screen.queryByTestId('home-screen')).not.toBeInTheDocument();
});

test('RequireAuth : non authenticated sur route protégée → redirection vers /login', async () => {
  mockState.isAuthenticated = false;
  mockState.isDoctor = false;
  window.history.pushState({}, '', '/patients');
  render(<App />);
  await waitFor(() =>
    expect(screen.getAllByText(/connexion/i).length).toBeGreaterThanOrEqual(1)
  );
  expect(screen.queryByTestId('patients-screen')).not.toBeInTheDocument();
  expect(mockLogout).not.toHaveBeenCalled();
});

test('route inconnue → redirection vers la racine', async () => {
  window.history.pushState({}, '', '/route-inexistante');
  render(<App />);
  await waitFor(() =>
    expect(screen.getAllByText(/connexion/i).length).toBeGreaterThanOrEqual(1)
  );
});
