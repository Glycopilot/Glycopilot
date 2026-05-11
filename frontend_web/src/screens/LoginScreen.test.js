import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginScreen from './LoginScreen';
import { useAuth } from '../hooks/useAuth';
import passwordService from '../services/passwordService';
import { toastError, toastSuccess } from '../services/toastService';

// Mocks
jest.mock('../hooks/useAuth');
jest.mock('../services/passwordService');
jest.mock('../services/toastService');

const mockNavigation = {
  navigate: jest.fn(),
};

describe('LoginScreen', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });
  });

  it('renders login form correctly', () => {
    render(<LoginScreen navigation={mockNavigation} />);
    
    expect(screen.getByPlaceholderText('medecin@exemple.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByText('Se connecter')).toBeInTheDocument();
  });

  it('handles successful login', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });
    render(<LoginScreen navigation={mockNavigation} />);
    
    fireEvent.change(screen.getByPlaceholderText('medecin@exemple.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'password123' },
    });
    
    fireEvent.click(screen.getByText('Se connecter'));
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(toastSuccess).toHaveBeenCalledWith('Connexion réussie', 'Bienvenue !');
      expect(mockNavigation.navigate).toHaveBeenCalledWith('/home');
    });
  });

  it('shows error toast when fields are missing', async () => {
    render(<LoginScreen navigation={mockNavigation} />);
    
    fireEvent.click(screen.getByText('Se connecter'));
    
    expect(toastError).toHaveBeenCalledWith('Champs manquants', expect.any(String));
  });

  it('handles login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    render(<LoginScreen navigation={mockNavigation} />);
    
    fireEvent.change(screen.getByPlaceholderText('medecin@exemple.com'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'wrong' },
    });
    
    fireEvent.click(screen.getByText('Se connecter'));
    
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Erreur de connexion', 'Invalid credentials');
    });
  });

  it('switches to password reset mode', () => {
    render(<LoginScreen navigation={mockNavigation} />);
    
    fireEvent.click(screen.getByText('Mot de passe oublié ?'));
    
    expect(screen.getByText('Votre email')).toBeInTheDocument();
    expect(screen.getByText('Envoyer le lien')).toBeInTheDocument();
  });

  it('handles password reset request', async () => {
    passwordService.requestPasswordReset.mockResolvedValueOnce({ success: true });
    render(<LoginScreen navigation={mockNavigation} />);
    
    fireEvent.click(screen.getByText('Mot de passe oublié ?'));
    
    fireEvent.change(screen.getByPlaceholderText('medecin@exemple.com'), {
      target: { value: 'reset@example.com' },
    });
    
    fireEvent.click(screen.getByText('Envoyer le lien'));
    
    await waitFor(() => {
      expect(passwordService.requestPasswordReset).toHaveBeenCalledWith('reset@example.com');
      expect(toastSuccess).toHaveBeenCalledWith('Email envoyé', expect.any(String));
    });
  });

  it('toggles password visibility', () => {
    render(<LoginScreen navigation={mockNavigation} />);
    
    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Find the toggle button (it contains an SVG)
    const toggleButton = screen.getByRole('button', { name: '' }); // Or by container
    // Since it's a simple test, let's find it by clicking the parent of the icon
    // Actually, I'll just look for the button with the eye icon
    const buttons = screen.getAllByRole('button');
    const toggleBtn = buttons.find(b => b.className === 'password-toggle');
    
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('navigates to signup', () => {
    render(<LoginScreen navigation={mockNavigation} />);
    
    fireEvent.click(screen.getAllByText(/S'inscrire/)[0]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('/signin');
  });
});
