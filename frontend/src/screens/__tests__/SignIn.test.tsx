import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignIn from '../SignIn';
import authService from '../../services/authService';

// Mock services
jest.mock('../../services/authService');

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
    reset: jest.fn(),
};

describe('SignIn Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authService.register as jest.Mock).mockResolvedValue({ user: { id: 1 } });
    });

    it('renders correctly', () => {
        const { getByPlaceholderText, getByText } = render(<SignIn navigation={mockNavigation as any} />);

        expect(getByPlaceholderText(/Prénom/i)).toBeTruthy();
        expect(getByPlaceholderText(/Nom/i)).toBeTruthy();
        expect(getByPlaceholderText(/Email/i)).toBeTruthy();
        expect(getByText(/S'inscrire/i)).toBeTruthy();
    });

    it('calls register function on submit', async () => {
        const { getByPlaceholderText, getByText, getByLabelText } = render(<SignIn navigation={mockNavigation as any} />);

        // Find by placeholder
        fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');
        fireEvent.changeText(getByPlaceholderText('user@example.com')[0], 'john@example.com'); // First is email
        fireEvent.changeText(getByPlaceholderText('user@example.com')[1], 'john@example.com'); // Second is confirm email
        fireEvent.changeText(getByPlaceholderText('••••••••')[0], 'Password123'); // First is password
        fireEvent.changeText(getByPlaceholderText('••••••••')[1], 'Password123'); // Second is confirm password

        fireEvent.press(getByText(/S'inscrire/i));

        await waitFor(() => {
            expect(authService.register).toHaveBeenCalled();
        });
    });
});
