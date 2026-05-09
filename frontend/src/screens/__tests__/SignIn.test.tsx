import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SignIn from '../SignIn';
import authService from '../../services/authService';
import { toastError, toastSuccess } from '../../services/toastService';

jest.mock('../../services/authService');
jest.mock('../../services/toastService');

const mockNavigation = { navigate: jest.fn(), reset: jest.fn() };

const renderSignIn = (nav = mockNavigation) =>
    render(<SignIn navigation={nav as any} />);

const setField = (queries: ReturnType<typeof render>, placeholder: string, value: string) =>
    fireEvent.changeText(queries.getByPlaceholderText(placeholder), value);

const setFieldAll = (queries: ReturnType<typeof render>, placeholder: string, index: number, value: string) =>
    fireEvent.changeText(queries.getAllByPlaceholderText(placeholder)[index], value);

const fillNames = (q: ReturnType<typeof render>) => {
    setField(q, 'Prénom', 'John');
    setField(q, 'Nom', 'Doe');
};

const fillMatchingEmails = (q: ReturnType<typeof render>, email = 'a@test.com') => {
    setFieldAll(q, 'user@example.com', 0, email);
    setFieldAll(q, 'user@example.com', 1, email);
};

const fillMatchingPasswords = (q: ReturnType<typeof render>, pw = 'Password123') => {
    setFieldAll(q, '••••••••', 0, pw);
    setFieldAll(q, '••••••••', 1, pw);
};

const pressSubmit = (q: ReturnType<typeof render>) =>
    fireEvent.press(q.getByText(/S'inscrire/i));

describe('SignIn Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (authService.register as jest.Mock).mockResolvedValue({ user: { id: 1 } });
    });

    it('renders correctly', () => {
        const q = renderSignIn();
        expect(q.getByPlaceholderText('Prénom')).toBeTruthy();
        expect(q.getByText(/S'inscrire/i)).toBeTruthy();
    });

    it('navigates to Login when already have account pressed', () => {
        const { getByText } = renderSignIn();
        fireEvent.press(getByText(/Avez vous compte/i));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });

    describe('validation errors', () => {
        it('shows error when firstName or lastName is empty', () => {
            pressSubmit(renderSignIn());
            expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez fournir le nom et le prénom');
        });

        it('shows error when emails do not match', () => {
            const q = renderSignIn();
            fillNames(q);
            setFieldAll(q, 'user@example.com', 0, 'a@test.com');
            setFieldAll(q, 'user@example.com', 1, 'b@test.com');
            pressSubmit(q);
            expect(toastError).toHaveBeenCalledWith('Erreur', 'Les emails ne correspondent pas');
        });

        it('shows error when passwords do not match', () => {
            const q = renderSignIn();
            fillNames(q);
            fillMatchingEmails(q);
            setFieldAll(q, '••••••••', 0, 'Pass123');
            setFieldAll(q, '••••••••', 1, 'Pass456');
            pressSubmit(q);
            expect(toastError).toHaveBeenCalledWith('Erreur', 'Les mots de passe ne correspondent pas');
        });

        it('shows error when password is too short', () => {
            const q = renderSignIn();
            fillNames(q);
            fillMatchingEmails(q);
            fillMatchingPasswords(q, 'Pa1');
            pressSubmit(q);
            expect(toastError).toHaveBeenCalledWith(
                'Erreur',
                'Le mot de passe doit contenir au moins 8 caractères'
            );
        });

        it('shows error when email format is invalid', () => {
            const q = renderSignIn();
            fillNames(q);
            fillMatchingEmails(q, 'not-an-email');
            fillMatchingPasswords(q, 'Password1');
            pressSubmit(q);
            expect(toastError).toHaveBeenCalledWith('Erreur', "L'adresse email n'est pas valide");
        });

        it('shows error when password has no digit', () => {
            const q = renderSignIn();
            fillNames(q);
            fillMatchingEmails(q);
            fillMatchingPasswords(q, 'PasswordNoDigit');
            pressSubmit(q);
            expect(toastError).toHaveBeenCalledWith(
                'Erreur',
                'Le mot de passe doit contenir au moins un chiffre'
            );
        });

        it('shows error when password has no uppercase', () => {
            const q = renderSignIn();
            fillNames(q);
            fillMatchingEmails(q);
            fillMatchingPasswords(q, 'password123');
            pressSubmit(q);
            expect(toastError).toHaveBeenCalledWith(
                'Erreur',
                'Le mot de passe doit contenir au moins une lettre majuscule'
            );
        });
    });

    describe('successful registration', () => {
        it('calls register and resets navigation', async () => {
            const q = renderSignIn();
            fillNames(q);
            fillMatchingEmails(q, 'john@example.com');
            fillMatchingPasswords(q);

            await act(async () => { pressSubmit(q); });

            await waitFor(() => {
                expect(authService.register).toHaveBeenCalled();
                expect(mockNavigation.reset).toHaveBeenCalledWith({
                    index: 0,
                    routes: [{ name: 'Login' }],
                });
            });
        });

        it('uses navigate when reset is not available', async () => {
            const navWithoutReset = { navigate: jest.fn() };
            const q = renderSignIn(navWithoutReset);
            fillNames(q);
            fillMatchingEmails(q, 'john@example.com');
            fillMatchingPasswords(q);

            await act(async () => { pressSubmit(q); });

            await waitFor(() => {
                expect(navWithoutReset.navigate).toHaveBeenCalledWith('Login');
            });
        });

        it('shows error on registration failure', async () => {
            (authService.register as jest.Mock).mockRejectedValue(new Error('Email déjà utilisé'));
            const q = renderSignIn();
            fillNames(q);
            fillMatchingEmails(q, 'john@example.com');
            fillMatchingPasswords(q);

            await act(async () => { pressSubmit(q); });

            await waitFor(() => {
                expect(toastError).toHaveBeenCalledWith('Erreur inscription', 'Email déjà utilisé');
            });
        });
    });
});
