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
        const { getByPlaceholderText, getByText } = render(<LogIn navigation={mockNavigation as any} />);

        expect(getByPlaceholderText(/Email/i)).toBeTruthy();
        expect(getByPlaceholderText(/Mot de passe/i)).toBeTruthy();
        expect(getByText(/Se connecter/i)).toBeTruthy();
    });

    it('calls login function on submit', async () => {
        const { getByPlaceholderText, getByText } = render(<LogIn navigation={mockNavigation as any} />);

        fireEvent.changeText(getByPlaceholderText(/Email/i), 'test@example.com');
        fireEvent.changeText(getByPlaceholderText(/Mot de passe/i), 'password123');
        fireEvent.press(getByText(/Se connecter/i));

        await waitFor(() => {
            expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
        });
    });
});
