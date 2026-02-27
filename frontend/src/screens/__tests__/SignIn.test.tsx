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
        const { getByPlaceholderText, getByText } = render(
            <SignIn navigation={mockNavigation as any} />,
        );

        expect(getByPlaceholderText('Prénom')).toBeTruthy();
        expect(getByText(/S'inscrire/i)).toBeTruthy();
    });

    it('calls register function on submit', async () => {
        const { getByPlaceholderText, getAllByPlaceholderText, getByText } = render(
            <SignIn navigation={mockNavigation as any} />,
        );

        fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');

        const emailInputs = getAllByPlaceholderText('user@example.com');
        fireEvent.changeText(emailInputs[0], 'john@example.com'); // email
        fireEvent.changeText(emailInputs[1], 'john@example.com'); // confirm email

        const passwordInputs = getAllByPlaceholderText('••••••••');
        fireEvent.changeText(passwordInputs[0], 'Password123'); // password
        fireEvent.changeText(passwordInputs[1], 'Password123'); // confirm password

        fireEvent.press(getByText(/S'inscrire/i));

        await waitFor(() => {
            expect(authService.register).toHaveBeenCalled();
        });
    });
});
