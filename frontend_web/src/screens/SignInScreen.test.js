import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignInScreen from './SignInScreen';
import authService from '../services/authService';
import { toastError, toastSuccess } from '../services/toastService';

// Mocks
jest.mock('../services/authService');
jest.mock('../services/toastService');

const mockNavigation = {
  navigate: jest.fn(),
};

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders signup form', () => {
    render(<SignInScreen navigation={mockNavigation} />);
    
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Jean')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Dupont')).toBeInTheDocument();
  });

  it('handles successful registration', async () => {
    authService.register.mockResolvedValueOnce({ success: true });
    render(<SignInScreen navigation={mockNavigation} />);
    
    fireEvent.change(screen.getByPlaceholderText('Jean'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('Dupont'), { target: { value: 'Doe' } });
    
    const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
    fireEvent.change(emailInputs[0], { target: { value: 'john@doe.com' } });
    fireEvent.change(emailInputs[1], { target: { value: 'john@doe.com' } });
    
    fireEvent.change(screen.getByPlaceholderText('10001234567'), { target: { value: '12345678901' } });
    fireEvent.change(screen.getByPlaceholderText('Ex : Cardiologue'), { target: { value: 'Généraliste' } });
    fireEvent.change(screen.getByPlaceholderText("123 Rue de l'Hôpital, Paris"), { target: { value: '1 rue Test' } });
    
    const passwordInputs = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'Password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'Password123' } });
    
    fireEvent.click(screen.getByText("Créer mon compte"));
    
    await waitFor(() => {
      expect(authService.register).toHaveBeenCalled();
      expect(screen.getByText('Inscription réussie !')).toBeInTheDocument();
    });
  });

  it('shows error when fields are missing', async () => {
    render(<SignInScreen navigation={mockNavigation} />);
    
    fireEvent.click(screen.getByText("Créer mon compte"));
    
    expect(toastError).toHaveBeenCalledWith('Erreur', expect.any(String));
  });
});
