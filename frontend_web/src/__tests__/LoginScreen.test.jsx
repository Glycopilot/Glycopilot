/**
 * @file LoginScreen.test.jsx
 * Stack : Vitest + React Testing Library
 * Lancer : npx vitest run src/__tests__/LoginScreen.test.jsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────
let mockLogin = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ login: mockLogin, loading: false, error: null })),
}));
vi.mock('../services/passwordService', () => ({
  default: { requestPasswordReset: vi.fn() },
}));
vi.mock('../services/toastService', () => ({
  toastError: vi.fn(), toastSuccess: vi.fn(),
}));
vi.mock('../assets/glycopilot.png', () => ({ default: 'logo.png' }));
vi.mock('./css/auth.css', () => ({}));

import LoginScreen from '../screens/LoginScreen';
import { useAuth } from '../hooks/useAuth';
import { toastError, toastSuccess } from '../services/toastService';
import passwordService from '../services/passwordService';

// ── Helpers ───────────────────────────────────────────────────────────────────
const navigation = { navigate: vi.fn() };
const render$ = () => render(<LoginScreen navigation={navigation} />);

async function fillAndSubmit(email = 'doc@test.com', password = 'Password1') {
  await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), email);
  await userEvent.type(screen.getByPlaceholderText('••••••••'), password);
  fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin = vi.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ login: mockLogin, loading: false, error: null });
  });

  // ─── 1. Rendu initial ─────────────────────────────────────────────────────
  describe('Rendu initial', () => {
    it('affiche le titre Connexion', () => {
      render$();
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    });

    it('champ email et mot de passe présents', () => {
      render$();
      expect(screen.getByPlaceholderText('medecin@exemple.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('mot de passe masqué par défaut (type=password)', () => {
      render$();
      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
    });

    it('bouton Se connecter présent', () => {
      render$();
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    });

    it('lien Mot de passe oublié ? présent', () => {
      render$();
      expect(screen.getByRole('button', { name: /mot de passe oublié/i })).toBeInTheDocument();
    });

    it('logo GlycoPilot présent', () => {
      render$();
      expect(screen.getAllByAltText('GlycoPilot').length).toBeGreaterThanOrEqual(1);
    });

    it('bouton S\'inscrire dans la topbar mobile', () => {
      render$();
      const topbarBtn = document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link');
      expect(topbarBtn).toBeTruthy();
      expect(topbarBtn.textContent).toMatch(/s'inscrire/i);
    });

    it('lien S\'inscrire dans le switch mobile en bas de formulaire', () => {
      render$();
      expect(document.querySelector('.auth-mobile-switch-btn')).toBeTruthy();
    });
  });

  // ─── 2. Validation des champs ─────────────────────────────────────────────
  describe('Validation', () => {
    it('email + mot de passe vides → toastError Champs manquants', () => {
      render$();
      fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
      expect(toastError).toHaveBeenCalledWith('Champs manquants', expect.any(String));
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('seulement mot de passe rempli → login non appelé', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password1');
      fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('seulement email rempli → login non appelé', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'test@test.com');
      fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  // ─── 3. Connexion réussie ─────────────────────────────────────────────────
  describe('Connexion réussie', () => {
    it('appelle login(email, password)', async () => {
      render$();
      await fillAndSubmit('doc@test.com', 'Password1');
      await waitFor(() =>
        expect(mockLogin).toHaveBeenCalledWith('doc@test.com', 'Password1')
      );
    });

    it('toastSuccess("Connexion réussie", "Bienvenue !")', async () => {
      render$();
      await fillAndSubmit();
      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('Connexion réussie', 'Bienvenue !')
      );
    });

    it('navigue vers /home', async () => {
      render$();
      await fillAndSubmit();
      await waitFor(() =>
        expect(navigation.navigate).toHaveBeenCalledWith('/home')
      );
    });

    it('vide le champ email après connexion', async () => {
      render$();
      const emailInput = screen.getByPlaceholderText('medecin@exemple.com');
      await fillAndSubmit();
      await waitFor(() => expect(emailInput).toHaveValue(''));
    });
  });

  // ─── 4. Connexion échouée ─────────────────────────────────────────────────
  describe('Connexion échouée', () => {
    it('toastError("Erreur de connexion", message) si login rejette', async () => {
      mockLogin = vi.fn().mockRejectedValue({ message: 'Identifiants incorrects' });
      useAuth.mockReturnValue({ login: mockLogin, loading: false, error: null });
      render$();
      await fillAndSubmit();
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur de connexion', 'Identifiants incorrects')
      );
    });

    it('ne navigue pas si erreur classique', async () => {
      mockLogin = vi.fn().mockRejectedValue({ message: 'Erreur' });
      useAuth.mockReturnValue({ login: mockLogin, loading: false, error: null });
      render$();
      await fillAndSubmit();
      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(navigation.navigate).not.toHaveBeenCalled();
    });
  });

  // ─── 5. Écran ACCOUNT_PENDING ────────────────────────────────────────────
  describe('ACCOUNT_PENDING', () => {
    beforeEach(() => {
      mockLogin = vi.fn().mockRejectedValue({ code: 'ACCOUNT_PENDING', message: '' });
      useAuth.mockReturnValue({ login: mockLogin, loading: false, error: null });
    });

    it('affiche "Licence en cours de vérification"', async () => {
      render$();
      await fillAndSubmit('pending@test.com', 'Password1');
      await waitFor(() =>
        expect(screen.getByText('Licence en cours de vérification')).toBeInTheDocument()
      );
    });

    it("affiche l'email du compte en attente (×2 dans le DOM)", async () => {
      render$();
      await fillAndSubmit('pending@test.com', 'Password1');
      await waitFor(() =>
        expect(screen.getAllByText('pending@test.com').length).toBeGreaterThanOrEqual(2)
      );
    });

    it('bouton "← Réessayer" retourne au formulaire login', async () => {
      render$();
      await fillAndSubmit('pending@test.com', 'Password1');
      await waitFor(() => screen.getByText('← Réessayer avec un autre compte'));
      fireEvent.click(screen.getByText('← Réessayer avec un autre compte'));
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    });
  });

  // ─── 6. Toggle visibilité mot de passe ───────────────────────────────────
  describe('Toggle mot de passe', () => {
    it('passe en type=text au premier clic sur .password-toggle', () => {
      render$();
      fireEvent.click(document.querySelector('.password-toggle'));
      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'text');
    });

    it('repasse en type=password au second clic', () => {
      render$();
      const btn = document.querySelector('.password-toggle');
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
    });
  });

  // ─── 7. Mode réinitialisation mot de passe ───────────────────────────────
  describe('Réinitialisation mot de passe', () => {
    const openReset = () =>
      fireEvent.click(screen.getByRole('button', { name: /mot de passe oublié/i }));

    it('affiche le titre "Mot de passe oublié ?"', () => {
      render$();
      openReset();
      expect(screen.getByRole('heading', { name: 'Mot de passe oublié ?' })).toBeInTheDocument();
    });

    it('boutons "Envoyer le lien" et "← Retour à la connexion" présents', () => {
      render$();
      openReset();
      expect(screen.getByRole('button', { name: /envoyer le lien/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retour à la connexion/i })).toBeInTheDocument();
    });

    it('champ vide → toastError("Email manquant", …)', () => {
      render$();
      openReset();
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      expect(toastError).toHaveBeenCalledWith('Email manquant', expect.any(String));
    });

    it('email malformé → toastError("Email invalide", …)', async () => {
      render$();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'pasunemail');
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      expect(toastError).toHaveBeenCalledWith('Email invalide', expect.any(String));
    });

    it('appelle requestPasswordReset(email) avec email valide', async () => {
      passwordService.requestPasswordReset.mockResolvedValue({});
      render$();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'doc@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      await waitFor(() =>
        expect(passwordService.requestPasswordReset).toHaveBeenCalledWith('doc@test.com')
      );
    });

    it('toastSuccess puis retour au formulaire login après succès', async () => {
      passwordService.requestPasswordReset.mockResolvedValue({});
      render$();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'doc@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Email envoyé', expect.any(String)));
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    });

    it('toastError("Erreur", msg) si requestPasswordReset rejette', async () => {
      passwordService.requestPasswordReset.mockRejectedValue({ message: 'Compte introuvable' });
      render$();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'inconnu@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Compte introuvable')
      );
    });

    it('retour au formulaire via "← Retour à la connexion"', () => {
      render$();
      openReset();
      fireEvent.click(screen.getByRole('button', { name: /retour à la connexion/i }));
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    });

    it('vide le champ resetEmail au retour', async () => {
      render$();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'test@test.com');
      fireEvent.click(screen.getByRole('button', { name: /retour à la connexion/i }));
      openReset();
      expect(screen.getByPlaceholderText('medecin@exemple.com')).toHaveValue('');
    });
  });

  // ─── 8. Navigation ───────────────────────────────────────────────────────
  describe('Navigation', () => {
    it('topbar mobile → /signin', () => {
      render$();
      fireEvent.click(document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link'));
      expect(navigation.navigate).toHaveBeenCalledWith('/signin');
    });

    it('bouton aside → /signin', () => {
      render$();
      fireEvent.click(document.querySelector('.aside-link'));
      expect(navigation.navigate).toHaveBeenCalledWith('/signin');
    });

    it('lien switch mobile (bas formulaire) → /signin', () => {
      render$();
      fireEvent.click(document.querySelector('.auth-mobile-switch-btn'));
      expect(navigation.navigate).toHaveBeenCalledWith('/signin');
    });

    it('touche Entrée sur le wrapper soumet le formulaire', async () => {
      render$();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'doc@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password1');
      fireEvent.keyPress(document.querySelector('.auth-form-wrapper'), { key: 'Enter', charCode: 13 });
      await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    });
  });
});