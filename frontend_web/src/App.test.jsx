import React from 'react';
import { render, screen, act } from '@testing-library/react';
import App from './App';
import authService from './services/authService';

// Mocks
jest.mock('./services/authService');
jest.mock('./screens/LoginScreen', () => ({ navigation }) => (
  <div data-testid="login-screen">
    Login Screen
    <button onClick={() => navigation.navigate('/signin')}>Go to Signin</button>
  </div>
));
jest.mock('./screens/SignInScreen', () => ({ navigation }) => (
  <div data-testid="signin-screen">
    Signin Screen
    <button onClick={() => navigation.navigate('/home')}>Go to Home</button>
  </div>
));
jest.mock('./screens/HomeScreen', () => ({ navigation }) => (
  <div data-testid="home-screen">
    Home Screen
    <button onClick={() => navigation.navigate('/patients')}>Go to Patients</button>
  </div>
));
jest.mock('./screens/PatientsScreen', () => ({ navigation }) => (
  <div data-testid="patients-screen">
    Patients Screen
    <button onClick={() => navigation.navigate('/profile')}>Go to Profile</button>
  </div>
));
jest.mock('./screens/ProfileScreen', () => ({ navigation }) => (
  <div data-testid="profile-screen">
    Profile Screen
    <button onClick={() => navigation.navigate('/login')}>Go to Login</button>
  </div>
));

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders LoginScreen when not authenticated', () => {
    authService.isAuthenticated.mockReturnValue(false);
    render(<App />);
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
  });

  it('renders HomeScreen when authenticated and no saved page', () => {
    authService.isAuthenticated.mockReturnValue(true);
    render(<App />);
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
  });

  it('renders saved page when authenticated', () => {
    authService.isAuthenticated.mockReturnValue(true);
    sessionStorage.setItem('currentPage', 'patients');
    render(<App />);
    expect(screen.getByTestId('patients-screen')).toBeInTheDocument();
  });

  it('navigates between screens correctly', async () => {
    authService.isAuthenticated.mockReturnValue(false);
    const { getByText, queryByTestId } = render(<App />);
    
    // Login -> Signin
    act(() => {
        screen.getByText('Go to Signin').click();
    });
    expect(screen.getByTestId('signin-screen')).toBeInTheDocument();

    // Signin -> Home
    act(() => {
        screen.getByText('Go to Home').click();
    });
    expect(screen.getByTestId('home-screen')).toBeInTheDocument();
    expect(sessionStorage.getItem('currentPage')).toBe('home');

    // Home -> Patients
    act(() => {
        screen.getByText('Go to Patients').click();
    });
    expect(screen.getByTestId('patients-screen')).toBeInTheDocument();
    expect(sessionStorage.getItem('currentPage')).toBe('patients');

    // Patients -> Profile
    act(() => {
        screen.getByText('Go to Profile').click();
    });
    expect(screen.getByTestId('profile-screen')).toBeInTheDocument();
    expect(sessionStorage.getItem('currentPage')).toBe('profile');

    // Profile -> Login
    act(() => {
        screen.getByText('Go to Login').click();
    });
    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(sessionStorage.getItem('currentPage')).toBeNull();
  });
});