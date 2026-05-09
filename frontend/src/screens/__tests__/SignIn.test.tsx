import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import SignIn from '../SignIn';
import authService from '../../services/authService';
import { toastError, toastSuccess } from '../../services/toastService';

jest.mock('../../services/authService');
jest.mock('../../services/toastService');

const mockNavigation = { navigate: jest.fn(), reset: jest.fn() };

const fillValidForm = (queries: ReturnType<typeof render>) => {
    const { getByPlaceholderText, getAllByPlaceholderText } = queries;
    fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
    fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');
    const emailInputs = getAllByPlaceholderText('user@example.com');
    fireEvent.changeText(emailInputs[0], 'john@example.com');
    fireEvent.changeText(emailInputs[1], 'john@example.com');
    const passwordInputs = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordInputs[0], 'Password123');
    fireEvent.changeText(passwordInputs[1], 'Password123');
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

    it('shows error when firstName or lastName is empty', () => {
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        fireEvent.press(queries.getByText(/S'inscrire/i));
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez fournir le nom et le prénom');
    });

    it('shows error when emails do not match', () => {
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        const { getByPlaceholderText, getAllByPlaceholderText, getByText } = queries;
        fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');
        const emailInputs = getAllByPlaceholderText('user@example.com');
        fireEvent.changeText(emailInputs[0], 'a@test.com');
        fireEvent.changeText(emailInputs[1], 'b@test.com');
        fireEvent.press(getByText(/S'inscrire/i));
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Les emails ne correspondent pas');
    });

    it('shows error when passwords do not match', () => {
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        const { getByPlaceholderText, getAllByPlaceholderText, getByText } = queries;
        fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');
        const emailInputs = getAllByPlaceholderText('user@example.com');
        fireEvent.changeText(emailInputs[0], 'a@test.com');
        fireEvent.changeText(emailInputs[1], 'a@test.com');
        const passwordInputs = getAllByPlaceholderText('••••••••');
        fireEvent.changeText(passwordInputs[0], 'Pass123');
        fireEvent.changeText(passwordInputs[1], 'Pass456');
        fireEvent.press(getByText(/S'inscrire/i));
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Les mots de passe ne correspondent pas');
    });

    it('shows error when email is missing', () => {
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        const { getByPlaceholderText, getByText } = queries;
        fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');
        fireEvent.press(getByText(/S'inscrire/i));
        expect(toastError).toHaveBeenCalled();
    });

    it('shows error when password is too short', () => {
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        const { getByPlaceholderText, getAllByPlaceholderText, getByText } = queries;
        fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');
        const emailInputs = getAllByPlaceholderText('user@example.com');
        fireEvent.changeText(emailInputs[0], 'a@test.com');
        fireEvent.changeText(emailInputs[1], 'a@test.com');
        const passwordInputs = getAllByPlaceholderText('••••••••');
        fireEvent.changeText(passwordInputs[0], 'Pa1');
        fireEvent.changeText(passwordInputs[1], 'Pa1');
        fireEvent.press(getByText(/S'inscrire/i));
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
    });

    it('shows error when email format is invalid', () => {
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        const { getByPlaceholderText, getAllByPlaceholderText, getByText } = queries;
        fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');
        const emailInputs = getAllByPlaceholderText('user@example.com');
        fireEvent.changeText(emailInputs[0], 'not-an-email');
        fireEvent.changeText(emailInputs[1], 'not-an-email');
        const passwordInputs = getAllByPlaceholderText('••••••••');
        fireEvent.changeText(passwordInputs[0], 'Password1');
        fireEvent.changeText(passwordInputs[1], 'Password1');
        fireEvent.press(getByText(/S'inscrire/i));
        expect(toastError).toHaveBeenCalledWith('Erreur', "L'adresse email n'est pas valide");
    });

    it('shows error when password has no digit', () => {
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        const { getByPlaceholderText, getAllByPlaceholderText, getByText } = queries;
        fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');
        const emailInputs = getAllByPlaceholderText('user@example.com');
        fireEvent.changeText(emailInputs[0], 'a@test.com');
        fireEvent.changeText(emailInputs[1], 'a@test.com');
        const passwordInputs = getAllByPlaceholderText('••••••••');
        fireEvent.changeText(passwordInputs[0], 'PasswordNoDigit');
        fireEvent.changeText(passwordInputs[1], 'PasswordNoDigit');
        fireEvent.press(getByText(/S'inscrire/i));
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Le mot de passe doit contenir au moins un chiffre');
    });

    it('shows error when password has no uppercase', () => {
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        const { getByPlaceholderText, getAllByPlaceholderText, getByText } = queries;
        fireEvent.changeText(getByPlaceholderText('Prénom'), 'John');
        fireEvent.changeText(getByPlaceholderText('Nom'), 'Doe');
        const emailInputs = getAllByPlaceholderText('user@example.com');
        fireEvent.changeText(emailInputs[0], 'a@test.com');
        fireEvent.changeText(emailInputs[1], 'a@test.com');
        const passwordInputs = getAllByPlaceholderText('••••••••');
        fireEvent.changeText(passwordInputs[0], 'password123');
        fireEvent.changeText(passwordInputs[1], 'password123');
        fireEvent.press(getByText(/S'inscrire/i));
        expect(toastError).toHaveBeenCalledWith(
            'Erreur',
            'Le mot de passe doit contenir au moins une lettre majuscule'
        );
    });

    it('calls register and navigates on success', async () => {
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        fillValidForm(queries);

        await act(async () => { fireEvent.press(queries.getByText(/S'inscrire/i)); });

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
        const queries = render(<SignIn navigation={navWithoutReset as any} />);
        fillValidForm(queries);

        await act(async () => { fireEvent.press(queries.getByText(/S'inscrire/i)); });

        await waitFor(() => {
            expect(navWithoutReset.navigate).toHaveBeenCalledWith('Login');
        });
    });

    it('shows error on registration failure', async () => {
        (authService.register as jest.Mock).mockRejectedValue(new Error('Email déjà utilisé'));
        const queries = render(<SignIn navigation={mockNavigation as any} />);
        fillValidForm(queries);

        await act(async () => { fireEvent.press(queries.getByText(/S'inscrire/i)); });

        await waitFor(() => {
            expect(toastError).toHaveBeenCalledWith('Erreur inscription', 'Email déjà utilisé');
        });
    });

    it('navigates to Login when already have account pressed', () => {
        const { getByText } = render(<SignIn navigation={mockNavigation as any} />);
        fireEvent.press(getByText(/Avez vous compte/i));
        expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
    });

    it('toggles password visibility', () => {
        const { getAllByTestId } = render(<SignIn navigation={mockNavigation as any} />);
        const eyeButtons = getAllByTestId('Eye');
        if (eyeButtons.length > 0) {
            fireEvent.press(eyeButtons[0]);
        }
    });
});
