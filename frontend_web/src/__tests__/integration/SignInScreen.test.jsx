import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.setTimeout(30000);

jest.mock('../../services/authService', () => ({
  __esModule: true,
  default: {
    register: jest.fn(),
    getApiClient: () => ({ post: jest.fn() }),
  },
}));
jest.mock('../../services/toastService', () => ({
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
}));

import SignInScreen from '../../screens/SignInScreen';
import authService from '../../services/authService';
import { toastError } from '../../services/toastService';

const navigation = { navigate: jest.fn() };
const renderSignIn = () => render(<SignInScreen navigation={navigation} />);

async function fillValidForm() {
  await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
  await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');

  const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
  await userEvent.type(emailInputs[0], 'jean.dupont@test.com');
  await userEvent.type(emailInputs[1], 'jean.dupont@test.com');

  await userEvent.type(screen.getByPlaceholderText('10001234567'), '12345678901');
  await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'), 'Généraliste');
  await userEvent.type(screen.getByPlaceholderText(/123 Rue de l'Hôpital/), '1 rue Test, Paris');

  const pwInputs = screen.getAllByPlaceholderText('••••••••');
  await userEvent.type(pwInputs[0], 'Password1');
  await userEvent.type(pwInputs[1], 'Password1');
}

const clickSubmit = () =>
  fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));

describe('SignInScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    navigation.navigate.mockClear();
    authService.register = jest.fn().mockResolvedValue({});
  });

  describe('Rendu initial', () => {
    it('affiche le titre "Créer un compte médecin"', () => {
      renderSignIn();
      expect(screen.getByRole('heading', { name: 'Créer un compte médecin' })).toBeInTheDocument();
    });

    it('affiche les 3 sections', () => {
      renderSignIn();
      expect(screen.getByText('Identité')).toBeInTheDocument();
      expect(screen.getByText('Informations professionnelles')).toBeInTheDocument();
      expect(screen.getByText('Sécurité')).toBeInTheDocument();
    });

    it('bouton "Créer mon compte" présent', () => {
      renderSignIn();
      expect(screen.getByRole('button', { name: /créer mon compte/i })).toBeInTheDocument();
    });

    it('topbar mobile avec "Se connecter"', () => {
      renderSignIn();
      const topbarBtn = document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link');
      expect(topbarBtn).toBeTruthy();
      expect(topbarBtn.textContent).toMatch(/se connecter/i);
    });

    it('lien switch mobile en bas du formulaire', () => {
      renderSignIn();
      expect(document.querySelector('.auth-mobile-switch-btn')).toBeTruthy();
    });

    it('mots de passe masqués par défaut', () => {
      renderSignIn();
      screen.getAllByPlaceholderText('••••••••').forEach((input) =>
        expect(input).toHaveAttribute('type', 'password')
      );
    });
  });

  describe('Validation séquentielle', () => {
    it('nom/prénom manquants', async () => {
      renderSignIn();
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez fournir le nom et le prénom');
    });

    it('email vide', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez remplir tous les champs');
    });

    it('email invalide', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      await userEvent.type(screen.getAllByPlaceholderText('medecin@exemple.com')[0], 'pasunemail');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', "L'adresse email n'est pas valide");
    });

    it('emails différents', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      const emails = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emails[0], 'a@test.com');
      await userEvent.type(emails[1], 'b@test.com');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Les emails ne correspondent pas');
    });

    it('licence manquante', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      const emails = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emails[0], 'a@test.com');
      await userEvent.type(emails[1], 'a@test.com');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez fournir votre numéro de licence');
    });

    it('spécialité manquante', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      const emails = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emails[0], 'a@test.com');
      await userEvent.type(emails[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'), '12345');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez indiquer votre spécialité');
    });

    it('adresse manquante', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      const emails = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emails[0], 'a@test.com');
      await userEvent.type(emails[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'), '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'), 'Généraliste');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', "Veuillez indiquer l'adresse de votre centre médical");
    });

    it('mot de passe < 8 caractères', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      const emails = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emails[0], 'a@test.com');
      await userEvent.type(emails[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'), '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'), 'Généraliste');
      await userEvent.type(screen.getByPlaceholderText(/123 Rue/), '1 rue');
      await userEvent.type(screen.getAllByPlaceholderText('••••••••')[0], 'Ab1');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
    });

    it('mot de passe sans chiffre', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      const emails = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emails[0], 'a@test.com');
      await userEvent.type(emails[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'), '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'), 'Généraliste');
      await userEvent.type(screen.getByPlaceholderText(/123 Rue/), '1 rue');
      await userEvent.type(screen.getAllByPlaceholderText('••••••••')[0], 'Abcdefgh');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Le mot de passe doit contenir au moins un chiffre');
    });

    it('mot de passe sans majuscule', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      const emails = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emails[0], 'a@test.com');
      await userEvent.type(emails[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'), '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'), 'Généraliste');
      await userEvent.type(screen.getByPlaceholderText(/123 Rue/), '1 rue');
      await userEvent.type(screen.getAllByPlaceholderText('••••••••')[0], 'abcdefg1');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Le mot de passe doit contenir au moins une lettre majuscule');
    });

    it('mots de passe différents', async () => {
      renderSignIn();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'), 'Jean');
      const emails = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emails[0], 'a@test.com');
      await userEvent.type(emails[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'), '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'), 'Généraliste');
      await userEvent.type(screen.getByPlaceholderText(/123 Rue/), '1 rue');
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      await userEvent.type(pwInputs[0], 'Password1');
      await userEvent.type(pwInputs[1], 'Password2');
      clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Les mots de passe ne correspondent pas');
    });
  });

  describe('Inscription réussie', () => {
    it('appelle authService.register avec les bons paramètres', async () => {
      renderSignIn();
      await fillValidForm();
      clickSubmit();
      await waitFor(() =>
        expect(authService.register).toHaveBeenCalledWith({
          email: 'jean.dupont@test.com',
          firstName: 'Jean',
          lastName: 'Dupont',
          password: 'Password1',
          passwordConfirm: 'Password1',
          role: 'DOCTOR',
          licenseNumber: '12345678901',
          specialty: 'Généraliste',
          medicalCenterAddress: '1 rue Test, Paris',
        })
      );
    });

    it('affiche l\'écran "Inscription réussie !"', async () => {
      renderSignIn();
      await fillValidForm();
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByText('Inscription réussie !')).toBeInTheDocument()
      );
    });

    it('affiche l\'email dans la carte de confirmation', async () => {
      renderSignIn();
      await fillValidForm();
      clickSubmit();
      await waitFor(() =>
        expect(screen.getAllByText('jean.dupont@test.com').length).toBeGreaterThanOrEqual(2)
      );
    });

    it('bouton "Aller à la page de connexion" présent', async () => {
      renderSignIn();
      await fillValidForm();
      clickSubmit();
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /aller à la page de connexion/i })).toBeInTheDocument()
      );
    });

    it('navigue vers /login depuis la confirmation', async () => {
      renderSignIn();
      await fillValidForm();
      clickSubmit();
      await waitFor(() => screen.getByRole('button', { name: /aller à la page de connexion/i }));
      fireEvent.click(screen.getByRole('button', { name: /aller à la page de connexion/i }));
      expect(navigation.navigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Inscription échouée', () => {
    it('toastError si register rejette', async () => {
      authService.register = jest.fn().mockRejectedValue({ message: 'Email déjà utilisé' });
      renderSignIn();
      await fillValidForm();
      clickSubmit();
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur inscription', 'Email déjà utilisé')
      );
    });

    it('reste sur le formulaire après échec', async () => {
      authService.register = jest.fn().mockRejectedValue({ message: 'Erreur serveur' });
      renderSignIn();
      await fillValidForm();
      clickSubmit();
      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(screen.getByRole('heading', { name: 'Créer un compte médecin' })).toBeInTheDocument();
    });
  });

  describe('Toggle mots de passe', () => {
    it('premier champ passe en type=text', () => {
      renderSignIn();
      const toggles = document.querySelectorAll('.password-toggle');
      fireEvent.click(toggles[0]);
      expect(screen.getAllByPlaceholderText('••••••••')[0]).toHaveAttribute('type', 'text');
    });

    it('deuxième champ passe en type=text indépendamment', () => {
      renderSignIn();
      const toggles = document.querySelectorAll('.password-toggle');
      fireEvent.click(toggles[1]);
      expect(screen.getAllByPlaceholderText('••••••••')[1]).toHaveAttribute('type', 'text');
    });

    it('les deux toggles sont indépendants', () => {
      renderSignIn();
      const toggles = document.querySelectorAll('.password-toggle');
      fireEvent.click(toggles[0]);
      expect(screen.getAllByPlaceholderText('••••••••')[0]).toHaveAttribute('type', 'text');
      expect(screen.getAllByPlaceholderText('••••••••')[1]).toHaveAttribute('type', 'password');
    });
  });

  describe('Navigation', () => {
    it('topbar mobile → /login', () => {
      renderSignIn();
      fireEvent.click(document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link'));
      expect(navigation.navigate).toHaveBeenCalledWith('/login');
    });

    it('bouton aside → /login', () => {
      renderSignIn();
      fireEvent.click(document.querySelector('.aside-link'));
      expect(navigation.navigate).toHaveBeenCalledWith('/login');
    });

    it('switch mobile en bas → /login', () => {
      renderSignIn();
      fireEvent.click(document.querySelector('.auth-mobile-switch-btn'));
      expect(navigation.navigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('Écran post-inscription', () => {
    async function goToConfirmation() {
      renderSignIn();
      await fillValidForm();
      clickSubmit();
      await waitFor(() => screen.getByText('Inscription réussie !'));
    }

    it('topbar mobile présente avec "Se connecter"', async () => {
      await goToConfirmation();
      const topbarBtn = document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link');
      expect(topbarBtn).toBeTruthy();
      expect(topbarBtn.textContent).toMatch(/se connecter/i);
    });

    it('aside affiche le tag "Compte créé"', async () => {
      await goToConfirmation();
      expect(screen.getAllByText(/compte créé/i)[0]).toBeInTheDocument();
    });

    it('aside affiche "Plus qu\'une étape !"', async () => {
      await goToConfirmation();
      expect(screen.getByText(/plus qu'une étape/i)).toBeInTheDocument();
    });

    it('affiche les 3 étapes de vérification', async () => {
      await goToConfirmation();
      expect(screen.getAllByText(/compte créé/i)[0]).toBeInTheDocument();
      expect(screen.getByText('Vérification de la licence')).toBeInTheDocument();
      expect(screen.getByText('Accès à la plateforme')).toBeInTheDocument();
    });
  });
});
