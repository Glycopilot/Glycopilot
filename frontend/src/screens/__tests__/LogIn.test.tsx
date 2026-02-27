import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LogIn from '../LogIn';
import authService from '../../services/authService';

// Mock services
jest.mock('../../services/authService');

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
    reset: jest.fn(),
};

describe('LogIn Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authService.login as jest.Mock).mockResolvedValue({ user: { id: 1 } });
    });

    it('renders correctly', () => {
        const { getByPlaceholderText, getByText } = render(
            <LogIn navigation={mockNavigation as any} />,
        );

        expect(getByPlaceholderText('user@example.com')).toBeTruthy();
        expect(getByPlaceholderText('••••••••')).toBeTruthy();
        expect(getByText(/Se connecter/i)).toBeTruthy();
    });

    // Le comportement détaillé de `authService.login` est couvert dans les tests
    // unitaires de `authService`. Ici on se contente de vérifier le rendu de base.
});
