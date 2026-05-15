import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockLogin = jest.fn();

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ login: mockLogin, loading: false, error: null })),
}));
jest.mock('../../services/passwordService', () => ({
  __esModule: true,
  default: { requestPasswordReset: jest.fn() },
}));
jest.mock('../../services/toastService', () => ({
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
}));

import LoginScreen from '../../screens/LoginScreen';
import { useAuth } from '../../hooks/useAuth';
import { toastError, toastSuccess } from '../../services/toastService';
import passwordService from '../../services/passwordService';

const navigation = { navigate: jest.fn() };
const renderLogin = () => render(<LoginScreen navigation={navigation} />);

async function fillAndSubmit(email = 'doc@test.com', password = 'Password1') {
  await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), email);
  await userEvent.type(screen.getByPlaceholderText('••••••••'), password);
  fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
}

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin = jest.fn().mockResolvedValue({});
    useAuth.mockReturnValue({ login: mockLogin, loading: false, error: null });
  });

  describe('Rendu initial', () => {
    it('affiche le titre Connexion', () => {
      renderLogin();
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    });

    it('champ email et mot de passe présents', () => {
      renderLogin();
      expect(screen.getByPlaceholderText('medecin@exemple.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });

    it('mot de passe masqué par défaut', () => {
      renderLogin();
      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
    });

    it('bouton Se connecter présent', () => {
      renderLogin();
      expect(screen.getByRole('button', { name: /se connecter/i })).toBeInTheDocument();
    });

    it('lien Mot de passe oublié présent', () => {
      renderLogin();
      expect(screen.getByRole('button', { name: /mot de passe oublié/i })).toBeInTheDocument();
    });

    it('logo GlycoPilot présent', () => {
      renderLogin();
      expect(screen.getAllByAltText('GlycoPilot').length).toBeGreaterThanOrEqual(1);
    });

    it("bouton S'inscrire dans la topbar mobile", () => {
      renderLogin();
      const topbarBtn = document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link');
      expect(topbarBtn).toBeTruthy();
      expect(topbarBtn.textContent).toMatch(/s'inscrire/i);
    });

    it("lien S'inscrire dans le switch mobile en bas de formulaire", () => {
      renderLogin();
      expect(document.querySelector('.auth-mobile-switch-btn')).toBeTruthy();
    });
  });

  describe('Validation', () => {
    it('champs vides → toastError "Champs manquants"', () => {
      renderLogin();
      fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
      expect(toastError).toHaveBeenCalledWith('Champs manquants', expect.any(String));
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('seul le mot de passe rempli → login non appelé', async () => {
      renderLogin();
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password1');
      fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('seul l\'email rempli → login non appelé', async () => {
      renderLogin();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'test@test.com');
      fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });

  describe('Connexion réussie', () => {
    it('appelle login(email, password)', async () => {
      renderLogin();
      await fillAndSubmit('doc@test.com', 'Password1');
      await waitFor(() =>
        expect(mockLogin).toHaveBeenCalledWith('doc@test.com', 'Password1')
      );
    });

    it('toastSuccess avec message de bienvenue', async () => {
      renderLogin();
      await fillAndSubmit();
      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('Connexion réussie', 'Bienvenue !')
      );
    });

    it('navigue vers /home', async () => {
      renderLogin();
      await fillAndSubmit();
      await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('/home'));
    });

    it('vide le champ email après connexion', async () => {
      renderLogin();
      const emailInput = screen.getByPlaceholderText('medecin@exemple.com');
      await fillAndSubmit();
      await waitFor(() => expect(emailInput).toHaveValue(''));
    });
  });

  describe('Connexion échouée', () => {
    it('toastError si login rejette', async () => {
      mockLogin = jest.fn().mockRejectedValue({ message: 'Identifiants incorrects' });
      useAuth.mockReturnValue({ login: mockLogin, loading: false, error: null });
      renderLogin();
      await fillAndSubmit();
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur de connexion', 'Identifiants incorrects')
      );
    });

    it('ne navigue pas après une erreur', async () => {
      mockLogin = jest.fn().mockRejectedValue({ message: 'Erreur' });
      useAuth.mockReturnValue({ login: mockLogin, loading: false, error: null });
      renderLogin();
      await fillAndSubmit();
      await waitFor(() => expect(toastError).toHaveBeenCalled());
      expect(navigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('ACCOUNT_PENDING', () => {
    beforeEach(() => {
      mockLogin = jest.fn().mockRejectedValue({ code: 'ACCOUNT_PENDING', message: '' });
      useAuth.mockReturnValue({ login: mockLogin, loading: false, error: null });
    });

    it('affiche "Licence en cours de vérification"', async () => {
      renderLogin();
      await fillAndSubmit('pending@test.com', 'Password1');
      await waitFor(() =>
        expect(screen.getByText('Licence en cours de vérification')).toBeInTheDocument()
      );
    });

    it("affiche l'email du compte en attente", async () => {
      renderLogin();
      await fillAndSubmit('pending@test.com', 'Password1');
      await waitFor(() =>
        expect(screen.getAllByText('pending@test.com').length).toBeGreaterThanOrEqual(2)
      );
    });

    it('le bouton "Réessayer" ramène au formulaire de connexion', async () => {
      renderLogin();
      await fillAndSubmit('pending@test.com', 'Password1');
      await waitFor(() => screen.getByText('← Réessayer avec un autre compte'));
      fireEvent.click(screen.getByText('← Réessayer avec un autre compte'));
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    });
  });

  describe('Toggle mot de passe', () => {
    it('passe en type=text au clic', () => {
      renderLogin();
      fireEvent.click(document.querySelector('.password-toggle'));
      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'text');
    });

    it('repasse en type=password au second clic', () => {
      renderLogin();
      const btn = document.querySelector('.password-toggle');
      fireEvent.click(btn);
      fireEvent.click(btn);
      expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
    });
  });

  describe('Réinitialisation mot de passe', () => {
    const openReset = () =>
      fireEvent.click(screen.getByRole('button', { name: /mot de passe oublié/i }));

    it('affiche le titre "Mot de passe oublié ?"', () => {
      renderLogin();
      openReset();
      expect(screen.getByRole('heading', { name: 'Mot de passe oublié ?' })).toBeInTheDocument();
    });

    it('affiche les boutons "Envoyer le lien" et "Retour à la connexion"', () => {
      renderLogin();
      openReset();
      expect(screen.getByRole('button', { name: /envoyer le lien/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retour à la connexion/i })).toBeInTheDocument();
    });

    it('champ vide → toastError "Email manquant"', () => {
      renderLogin();
      openReset();
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      expect(toastError).toHaveBeenCalledWith('Email manquant', expect.any(String));
    });

    it('email malformé → toastError "Email invalide"', async () => {
      renderLogin();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'pasunemail');
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      expect(toastError).toHaveBeenCalledWith('Email invalide', expect.any(String));
    });

    it('email valide → requestPasswordReset(email)', async () => {
      passwordService.requestPasswordReset.mockResolvedValue({});
      renderLogin();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'doc@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      await waitFor(() =>
        expect(passwordService.requestPasswordReset).toHaveBeenCalledWith('doc@test.com')
      );
    });

    it('succès → toastSuccess puis retour au formulaire', async () => {
      passwordService.requestPasswordReset.mockResolvedValue({});
      renderLogin();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'doc@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('Email envoyé', expect.any(String))
      );
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    });

    it('échec → toastError avec le message du service', async () => {
      passwordService.requestPasswordReset.mockRejectedValue({ message: 'Compte introuvable' });
      renderLogin();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'inconnu@test.com');
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Compte introuvable')
      );
    });

    it('bouton "Retour à la connexion" ramène au formulaire', () => {
      renderLogin();
      openReset();
      fireEvent.click(screen.getByRole('button', { name: /retour à la connexion/i }));
      expect(screen.getByRole('heading', { name: 'Connexion' })).toBeInTheDocument();
    });

    it('vide le champ resetEmail au retour', async () => {
      renderLogin();
      openReset();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'test@test.com');
      fireEvent.click(screen.getByRole('button', { name: /retour à la connexion/i }));
      openReset();
      expect(screen.getByPlaceholderText('medecin@exemple.com')).toHaveValue('');
    });
  });

  describe('Navigation', () => {
    it('topbar mobile → /signin', () => {
      renderLogin();
      fireEvent.click(document.querySelector('.auth-mobile-topbar .auth-mobile-topbar-link'));
      expect(navigation.navigate).toHaveBeenCalledWith('/signin');
    });

    it('bouton aside → /signin', () => {
      renderLogin();
      fireEvent.click(document.querySelector('.aside-link'));
      expect(navigation.navigate).toHaveBeenCalledWith('/signin');
    });

    it('switch mobile en bas → /signin', () => {
      renderLogin();
      fireEvent.click(document.querySelector('.auth-mobile-switch-btn'));
      expect(navigation.navigate).toHaveBeenCalledWith('/signin');
    });

    it('touche Entrée soumet le formulaire', async () => {
      renderLogin();
      await userEvent.type(screen.getByPlaceholderText('medecin@exemple.com'), 'doc@test.com');
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'Password1');
      fireEvent.keyPress(document.querySelector('.auth-form-wrapper'), { key: 'Enter', charCode: 13 });
      await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    });
  });
});
