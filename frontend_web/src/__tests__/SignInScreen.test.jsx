/**
 * @file SignInScreen.test.jsx
 * Stack : Vitest + React Testing Library
 * Lancer : npx vitest run src/__tests__/SignInScreen.test.jsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('../services/authService', () => ({
  default: { register: vi.fn(), getApiClient: () => ({ post: vi.fn() }) },
}));
vi.mock('../services/toastService', () => ({
  toastError: vi.fn(), toastSuccess: vi.fn(),
}));
vi.mock('../assets/glycopilot.png', () => ({ default: 'logo.png' }));
vi.mock('./css/auth.css', () => ({}));

import SignInScreen from '../screens/SignInScreen';
import authService from '../services/authService';
import { toastError } from '../services/toastService';

// ── Helpers ───────────────────────────────────────────────────────────────────
const navigation = { navigate: vi.fn() };
const render$ = () => render(<SignInScreen navigation={navigation} />);

/** Remplit tous les champs avec des valeurs valides */
async function fillValidForm() {
  // Section 01 – Identité
  await userEvent.type(screen.getByPlaceholderText('Dupont'),               'Dupont');
  await userEvent.type(screen.getByPlaceholderText('Jean'),                 'Jean');
  // Il y a 2 inputs "medecin@exemple.com" (email + confirm)
  const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
  await userEvent.type(emailInputs[0], 'jean.dupont@test.com');
  await userEvent.type(emailInputs[1], 'jean.dupont@test.com');
  // Section 02 – Pro
  await userEvent.type(screen.getByPlaceholderText('10001234567'),                   '12345678901');
  await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'),              'Généraliste');
  await userEvent.type(screen.getByPlaceholderText(/123 Rue de l'Hôpital/),          '1 rue Test, Paris');
  // Section 03 – Sécurité
  const pwInputs = screen.getAllByPlaceholderText('••••••••');
  await userEvent.type(pwInputs[0], 'Password1');
  await userEvent.type(pwInputs[1], 'Password1');
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('SignInScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.navigate.mockClear();
    authService.register = vi.fn().mockResolvedValue({});
  });

  // ─── 1. Rendu initial ─────────────────────────────────────────────────────
  describe('Rendu initial', () => {
    it('affiche le titre "Créer un compte médecin"', () => {
      render$();
      expect(screen.getByRole('heading', { name: 'Créer un compte médecin' })).toBeInTheDocument();
    });

    it('affiche les 3 sections numérotées 01 / 02 / 03', () => {
      render$();
      expect(screen.getByText('Identité')).toBeInTheDocument();
      expect(screen.getByText('Informations professionnelles')).toBeInTheDocument();
      expect(screen.getByText('Sécurité')).toBeInTheDocument();
    });

    it('bouton "Créer mon compte" présent', () => {
      render$();
      expect(screen.getByRole('button', { name: /créer mon compte/i })).toBeInTheDocument();
    });

    it('topbar mobile avec lien "Se connecter →"', () => {
      render$();
      const topbarBtn = document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link');
      expect(topbarBtn).toBeTruthy();
      expect(topbarBtn.textContent).toMatch(/se connecter/i);
    });

    it('lien switch mobile en bas du formulaire', () => {
      render$();
      expect(document.querySelector('.auth-mobile-switch-btn')).toBeTruthy();
    });

    it('2 champs mot de passe masqués par défaut', () => {
      render$();
      screen.getAllByPlaceholderText('••••••••').forEach(input =>
        expect(input).toHaveAttribute('type', 'password')
      );
    });
  });

  // ─── 2. Validation séquentielle ───────────────────────────────────────────
  describe('Validation des champs (ordre sequentiel du code)', () => {
    async function clickSubmit() {
      fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
    }

    it('nom/prénom manquants → toastError "Veuillez fournir le nom et le prénom"', async () => {
      render$();
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez fournir le nom et le prénom');
    });

    it('email vide → toastError "Veuillez remplir tous les champs"', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),   'Jean');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez remplir tous les champs');
    });

    it('email invalide → toastError "L\'adresse email n\'est pas valide"', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),   'Jean');
      await userEvent.type(screen.getAllByPlaceholderText('medecin@exemple.com')[0], 'pasunemail');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', "L'adresse email n'est pas valide");
    });

    it('emails différents → toastError "Les emails ne correspondent pas"', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),   'Jean');
      const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emailInputs[0], 'a@test.com');
      await userEvent.type(emailInputs[1], 'b@test.com');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Les emails ne correspondent pas');
    });

    it('licence manquante → toastError "Veuillez fournir votre numéro de licence"', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),   'Jean');
      const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emailInputs[0], 'a@test.com');
      await userEvent.type(emailInputs[1], 'a@test.com');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez fournir votre numéro de licence');
    });

    it('spécialité manquante → toastError "Veuillez indiquer votre spécialité"', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),   'Jean');
      const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emailInputs[0], 'a@test.com');
      await userEvent.type(emailInputs[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'), '12345');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Veuillez indiquer votre spécialité');
    });

    it('adresse manquante → toastError', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'), 'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),   'Jean');
      const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emailInputs[0], 'a@test.com');
      await userEvent.type(emailInputs[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'),      '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'), 'Généraliste');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', "Veuillez indiquer l'adresse de votre centre médical");
    });

    it('mot de passe < 8 chars → toastError "au moins 8 caractères"', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'),              'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),                'Jean');
      const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emailInputs[0], 'a@test.com');
      await userEvent.type(emailInputs[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'),         '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'),    'Généraliste');
      await userEvent.type(screen.getByPlaceholderText(/123 Rue/),             '1 rue');
      await userEvent.type(screen.getAllByPlaceholderText('••••••••')[0],      'Ab1');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
    });

    it('mot de passe sans chiffre → toastError "au moins un chiffre"', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'),              'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),                'Jean');
      const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emailInputs[0], 'a@test.com');
      await userEvent.type(emailInputs[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'),         '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'),    'Généraliste');
      await userEvent.type(screen.getByPlaceholderText(/123 Rue/),             '1 rue');
      await userEvent.type(screen.getAllByPlaceholderText('••••••••')[0],      'Abcdefgh');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Le mot de passe doit contenir au moins un chiffre');
    });

    it('mot de passe sans majuscule → toastError "au moins une lettre majuscule"', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'),              'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),                'Jean');
      const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emailInputs[0], 'a@test.com');
      await userEvent.type(emailInputs[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'),         '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'),    'Généraliste');
      await userEvent.type(screen.getByPlaceholderText(/123 Rue/),             '1 rue');
      await userEvent.type(screen.getAllByPlaceholderText('••••••••')[0],      'abcdefg1');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Le mot de passe doit contenir au moins une lettre majuscule');
    });

    it('mots de passe différents → toastError "ne correspondent pas"', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('Dupont'),              'Dupont');
      await userEvent.type(screen.getByPlaceholderText('Jean'),                'Jean');
      const emailInputs = screen.getAllByPlaceholderText('medecin@exemple.com');
      await userEvent.type(emailInputs[0], 'a@test.com');
      await userEvent.type(emailInputs[1], 'a@test.com');
      await userEvent.type(screen.getByPlaceholderText('10001234567'),         '12345');
      await userEvent.type(screen.getByPlaceholderText('Ex : Cardiologue'),    'Généraliste');
      await userEvent.type(screen.getByPlaceholderText(/123 Rue/),             '1 rue');
      const pwInputs = screen.getAllByPlaceholderText('••••••••');
      await userEvent.type(pwInputs[0], 'Password1');
      await userEvent.type(pwInputs[1], 'Password2');
      await clickSubmit();
      expect(toastError).toHaveBeenCalledWith('Erreur', 'Les mots de passe ne correspondent pas');
    });
  });

  // ─── 3. Inscription réussie ───────────────────────────────────────────────
  describe('Inscription réussie', () => {
    it('appelle authService.register avec les bons paramètres', async () => {
      render$();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
      await waitFor(() =>
        expect(authService.register).toHaveBeenCalledWith({
          email:                'jean.dupont@test.com',
          firstName:            'Jean',
          lastName:             'Dupont',
          password:             'Password1',
          passwordConfirm:      'Password1',
          role:                 'DOCTOR',
          licenseNumber:        '12345678901',
          specialty:            'Généraliste',
          medicalCenterAddress: '1 rue Test, Paris',
        })
      );
    });

    it('affiche l\'écran "Inscription réussie !"', async () => {
      render$();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
      await waitFor(() =>
        expect(screen.getByText('Inscription réussie !')).toBeInTheDocument()
      );
    });

    it('affiche l\'email enregistré dans la carte de confirmation (×2)', async () => {
      render$();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
      await waitFor(() =>
        expect(screen.getAllByText('jean.dupont@test.com').length).toBeGreaterThanOrEqual(2)
      );
    });

    it('bouton "Aller à la page de connexion" présent', async () => {
      render$();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /aller à la page de connexion/i })).toBeInTheDocument()
      );
    });

    it('navigue vers /login depuis la confirmation', async () => {
      render$();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
      await waitFor(() => screen.getByRole('button', { name: /aller à la page de connexion/i }));
      fireEvent.click(screen.getByRole('button', { name: /aller à la page de connexion/i }));
      expect(navigation.navigate).toHaveBeenCalledWith('/login');
    });
  });

  // ─── 4. Inscription échouée ───────────────────────────────────────────────
  describe('Inscription échouée', () => {
    it('toastError("Erreur inscription", msg) si register rejette', async () => {
      authService.register = vi.fn().mockRejectedValue({ message: 'Email déjà utilisé' });
      render$();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur inscription', 'Email déjà utilisé')
      );
    });

    it('reste sur le formulaire après échec (pas d\'écran de confirmation)', async () => {
      authService.register = vi.fn().mockRejectedValue({ message: 'Erreur serveur' });
      render$();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(screen.getByRole('heading', { name: 'Créer un compte médecin' })).toBeInTheDocument();
    });
  });

  // ─── 5. Toggle visibilité mots de passe ──────────────────────────────────
  describe('Toggle mots de passe', () => {
    it('premier champ passe en type=text au clic', () => {
      render$();
      const toggleBtns = document.querySelectorAll('.password-toggle');
      fireEvent.click(toggleBtns[0]);
      expect(screen.getAllByPlaceholderText('••••••••')[0]).toHaveAttribute('type', 'text');
    });

    it('deuxième champ passe en type=text indépendamment', () => {
      render$();
      const toggleBtns = document.querySelectorAll('.password-toggle');
      fireEvent.click(toggleBtns[1]);
      expect(screen.getAllByPlaceholderText('••••••••')[1]).toHaveAttribute('type', 'text');
    });

    it('les deux toggles sont indépendants', () => {
      render$();
      const toggleBtns = document.querySelectorAll('.password-toggle');
      fireEvent.click(toggleBtns[0]);
      // champ 0 = text, champ 1 = password
      expect(screen.getAllByPlaceholderText('••••••••')[0]).toHaveAttribute('type', 'text');
      expect(screen.getAllByPlaceholderText('••••••••')[1]).toHaveAttribute('type', 'password');
    });
  });

  // ─── 6. Navigation ───────────────────────────────────────────────────────
  describe('Navigation', () => {
    it('topbar mobile → /login', () => {
      render$();
      fireEvent.click(document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link'));
      expect(navigation.navigate).toHaveBeenCalledWith('/login');
    });

    it('bouton aside → /login', () => {
      render$();
      fireEvent.click(document.querySelector('.aside-link'));
      expect(navigation.navigate).toHaveBeenCalledWith('/login');
    });

    it('lien switch mobile (bas) → /login', () => {
      render$();
      fireEvent.click(document.querySelector('.auth-mobile-switch-btn'));
      expect(navigation.navigate).toHaveBeenCalledWith('/login');
    });
  });

  // ─── 7. Écran post-inscription : topbar et aside ───────────────────────
  describe('Écran post-inscription', () => {
    async function goToConfirmation() {
      render$();
      await fillValidForm();
      fireEvent.click(screen.getByRole('button', { name: /créer mon compte/i }));
      await waitFor(() => screen.getByText('Inscription réussie !'));
    }

    it('topbar mobile présente avec "Se connecter →"', async () => {
      await goToConfirmation();
      const topbarBtn = document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link');
      expect(topbarBtn).toBeTruthy();
      expect(topbarBtn.textContent).toMatch(/se connecter/i);
    });

    it('aside affiche le tag "Compte créé"', async () => {
      await goToConfirmation();
      expect(screen.getAllByText(/compte créé/i)[0]).toBeInTheDocument();
    });

    it('aside affiche le titre "Plus qu\'une étape !"', async () => {
      await goToConfirmation();
      expect(screen.getByText(/plus qu'une étape/i)).toBeInTheDocument();
    });

    it('les 3 étapes de vérification sont affichées', async () => {
      await goToConfirmation();
      expect(screen.getAllByText(/compte créé/i)[0]).toBeInTheDocument();
      expect(screen.getByText('Vérification de la licence')).toBeInTheDocument();
      expect(screen.getByText('Accès à la plateforme')).toBeInTheDocument();
    });
  });
});