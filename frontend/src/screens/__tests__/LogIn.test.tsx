import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LogIn from '../LogIn';
import authService from '../../services/authService';
import passwordService from '../../services/passwordService';
import { toastError, toastSuccess } from '../../services/toastService';

jest.mock('../../services/authService');
jest.mock('../../services/passwordService');
jest.mock('../../services/toastService');

const mockNavigation = {
    navigate: jest.fn(),
    reset: jest.fn(),
};

const renderLogin = () => render(<LogIn navigation={mockNavigation as any} />);

describe('LogIn Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authService.login as jest.Mock).mockResolvedValue({ user: { id: 1 } });
        (passwordService.requestPasswordReset as jest.Mock).mockResolvedValue(undefined);
    });

    it('renders correctly', () => {
        const { getByPlaceholderText, getByText } = renderLogin();
        expect(getByPlaceholderText('user@example.com')).toBeTruthy();
        expect(getByPlaceholderText('••••••••')).toBeTruthy();
        expect(getByText(/Se connecter/i)).toBeTruthy();
    });

    it('shows error when fields are empty on login', async () => {
        const { getByText } = renderLogin();
        fireEvent.press(getByText('Se connecter'));
        expect(toastError).toHaveBeenCalled();
    });

    it('calls authService.login with credentials', async () => {
        const { getByPlaceholderText, getByText } = renderLogin();
        fireEvent.changeText(getByPlaceholderText('user@example.com'), 'test@test.com');
        fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');

        await act(async () => { fireEvent.press(getByText('Se connecter')); });

        await waitFor(() => {
            expect(authService.login).toHaveBeenCalledWith('test@test.com', 'password123');
        });
    });

    it('calls navigation.reset on successful login', async () => {
        const { getByPlaceholderText, getByText } = renderLogin();
        fireEvent.changeText(getByPlaceholderText('user@example.com'), 'test@test.com');
        fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');

        await act(async () => { fireEvent.press(getByText('Se connecter')); });

        await waitFor(() => {
            expect(mockNavigation.reset).toHaveBeenCalledWith({
                index: 0,
                routes: [{ name: 'Home' }],
            });
        });
    });

    it('shows error on login failure', async () => {
        (authService.login as jest.Mock).mockRejectedValue(new Error('Identifiants invalides'));

        const { getByPlaceholderText, getByText } = renderLogin();
        fireEvent.changeText(getByPlaceholderText('user@example.com'), 'bad@test.com');
        fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrongpass');

        await act(async () => { fireEvent.press(getByText('Se connecter')); });

        await waitFor(() => {
            expect(toastError).toHaveBeenCalledWith('Erreur de connexion', 'Identifiants invalides');
        });
    });

    it('toggles password visibility', () => {
        const { getByTestId, getByPlaceholderText } = renderLogin();
        const eyeButton = getByTestId('Eye');
        fireEvent.press(eyeButton);
        expect(getByPlaceholderText('••••••••')).toBeTruthy();
    });

    it('navigates to SignIn screen', () => {
        const { getByText } = renderLogin();
        fireEvent.press(getByText(/Pas encore de compte/i));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('SignIn');
    });

    it('switches to password reset mode', () => {
        const { getByText, getByPlaceholderText } = renderLogin();
        fireEvent.press(getByText('Mot de passe oublié ?'));
        expect(getByText('Envoyer le lien')).toBeTruthy();
        expect(getByPlaceholderText('user@example.com')).toBeTruthy();
    });

    it('shows error when reset email is empty', async () => {
        const { getByText } = renderLogin();
        fireEvent.press(getByText('Mot de passe oublié ?'));
        fireEvent.press(getByText('Envoyer le lien'));
        expect(toastError).toHaveBeenCalled();
    });

    it('shows error when reset email is invalid', async () => {
        const { getByText, getByPlaceholderText } = renderLogin();
        fireEvent.press(getByText('Mot de passe oublié ?'));
        fireEvent.changeText(getByPlaceholderText('user@example.com'), 'invalid-email');
        fireEvent.press(getByText('Envoyer le lien'));
        expect(toastError).toHaveBeenCalled();
    });

    it('sends password reset and returns to login', async () => {
        const { getByText, getByPlaceholderText } = renderLogin();
        fireEvent.press(getByText('Mot de passe oublié ?'));
        fireEvent.changeText(getByPlaceholderText('user@example.com'), 'user@test.com');

        await act(async () => { fireEvent.press(getByText('Envoyer le lien')); });

        await waitFor(() => {
            expect(passwordService.requestPasswordReset).toHaveBeenCalledWith('user@test.com');
            expect(toastSuccess).toHaveBeenCalled();
        });
    });

    it('shows error on password reset failure', async () => {
        (passwordService.requestPasswordReset as jest.Mock).mockRejectedValue(new Error('Erreur'));

        const { getByText, getByPlaceholderText } = renderLogin();
        fireEvent.press(getByText('Mot de passe oublié ?'));
        fireEvent.changeText(getByPlaceholderText('user@example.com'), 'user@test.com');

        await act(async () => { fireEvent.press(getByText('Envoyer le lien')); });

        await waitFor(() => expect(toastError).toHaveBeenCalled());
    });

    it('goes back to login from reset mode', async () => {
        const { getByText } = renderLogin();
        fireEvent.press(getByText('Mot de passe oublié ?'));
        await waitFor(() => expect(getByText('Retour')).toBeTruthy());
        fireEvent.press(getByText('Retour'));
        expect(getByText('Se connecter')).toBeTruthy();
    });
});
