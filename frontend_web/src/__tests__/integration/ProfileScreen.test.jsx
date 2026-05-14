import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('../../services/authService', () => {
  const apiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn() };
  return {
    __esModule: true,
    default: {
      getApiClient: () => apiClient,
      getStoredUser: jest.fn(() => null),
    },
  };
});
jest.mock('../../services/passwordService', () => ({
  __esModule: true,
  default: { requestPasswordReset: jest.fn() },
}));
jest.mock('../../services/toastService', () => ({
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
}));
jest.mock('../../components/Sidebar', () => ({
  __esModule: true,
  default: ({ activePage }) => <div data-testid="sidebar" data-page={activePage} />,
}));

import ProfileScreen from '../../screens/ProfileScreen';
import authService from '../../services/authService';
import passwordService from '../../services/passwordService';
import { toastError, toastSuccess } from '../../services/toastService';

const apiClient = authService.getApiClient();
const { get: mockGet, patch: mockPatch } = apiClient;

function authMeResponse(overrides = {}) {
  return {
    id_auth: 'auth-1',
    email: 'doctor@example.com',
    identity: {
      id_user: 'u-1',
      first_name: 'Jean',
      last_name: 'Dupont',
      profiles: [
        {
          doctor_details: {
            doctor_id: 'd-1',
            license_number: '10001234567',
            verification_status: 'VERIFIED',
            specialty: 'Cardiologue',
            medical_center_name: 'Hôpital Test',
            medical_center_address: '1 rue Test, Paris',
            user_details: { phone_number: '+33612345678' },
          },
        },
      ],
    },
    ...overrides,
  };
}

const navigation = { navigate: jest.fn() };
const renderProfile = () => render(<ProfileScreen navigation={navigation} />);

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({ data: authMeResponse() });
    mockPatch.mockResolvedValue({ data: {} });
  });

  describe('Chargement', () => {
    it('affiche un spinner pendant le fetch initial', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      renderProfile();
      expect(document.querySelector('.mini-spinner')).toBeTruthy();
    });

    it('fetch /auth/me/ au montage', async () => {
      renderProfile();
      await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/auth/me/'));
    });

    it('sidebar montée avec activePage="profile"', async () => {
      renderProfile();
      await waitFor(() =>
        expect(screen.getByTestId('sidebar')).toHaveAttribute('data-page', 'profile')
      );
    });
  });

  describe('Affichage des infos', () => {
    it('affiche le nom complet en tête', async () => {
      renderProfile();
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Jean Dupont' })).toBeInTheDocument()
      );
    });

    it('affiche la spécialité et l\'email', async () => {
      renderProfile();
      await waitFor(() => screen.getByText(/Cardiologue · doctor@example\.com/));
    });

    it('affiche le badge "Compte vérifié" quand status = VERIFIED', async () => {
      renderProfile();
      await waitFor(() =>
        expect(screen.getByText(/compte vérifié/i)).toBeInTheDocument()
      );
    });

    it('email et licence sont marqués "Non modifiable"', async () => {
      renderProfile();
      await waitFor(() => screen.getByDisplayValue('doctor@example.com'));
      expect(screen.getAllByText('Non modifiable').length).toBeGreaterThanOrEqual(2);
    });

    it('téléphone et spécialité sont initialement désactivés', async () => {
      renderProfile();
      await waitFor(() => screen.getByDisplayValue('+33612345678'));
      expect(screen.getByDisplayValue('+33612345678')).toBeDisabled();
      expect(screen.getByDisplayValue('Cardiologue')).toBeDisabled();
    });
  });

  describe('Mode édition', () => {
    it('clic "Modifier le profil" active les champs', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /modifier le profil/i }));
      fireEvent.click(screen.getByRole('button', { name: /modifier le profil/i }));
      expect(screen.getByDisplayValue('+33612345678')).not.toBeDisabled();
      expect(screen.getByDisplayValue('Cardiologue')).not.toBeDisabled();
    });

    it('"Annuler" restaure les valeurs initiales', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /modifier le profil/i }));
      fireEvent.click(screen.getByRole('button', { name: /modifier le profil/i }));
      const phoneInput = screen.getByDisplayValue('+33612345678');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '+33700000000');
      fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
      expect(screen.getByDisplayValue('+33612345678')).toBeInTheDocument();
    });

    it('"Sauvegarder" appelle PATCH /users/me/ avec les champs modifiables', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /modifier le profil/i }));
      fireEvent.click(screen.getByRole('button', { name: /modifier le profil/i }));
      const phoneInput = screen.getByDisplayValue('+33612345678');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '+33700000000');
      fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));
      await waitFor(() =>
        expect(mockPatch).toHaveBeenCalledWith('/users/me/', expect.objectContaining({
          phone_number: '+33700000000',
          first_name: 'Jean',
          last_name: 'Dupont',
        }))
      );
    });

    it('toastSuccess après sauvegarde réussie', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /modifier le profil/i }));
      fireEvent.click(screen.getByRole('button', { name: /modifier le profil/i }));
      fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));
      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('Profil mis à jour', expect.any(String))
      );
    });

    it('toastError si PATCH /users/me/ échoue', async () => {
      mockPatch.mockRejectedValueOnce({ response: { data: { error: 'Téléphone invalide' } } });
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /modifier le profil/i }));
      fireEvent.click(screen.getByRole('button', { name: /modifier le profil/i }));
      fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Téléphone invalide')
      );
    });

    it('sort du mode édition après sauvegarde réussie', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /modifier le profil/i }));
      fireEvent.click(screen.getByRole('button', { name: /modifier le profil/i }));
      fireEvent.click(screen.getByRole('button', { name: /sauvegarder/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /modifier le profil/i })).toBeInTheDocument()
      );
    });
  });

  describe('Réinitialisation du mot de passe', () => {
    it('clic envoie un email via passwordService', async () => {
      passwordService.requestPasswordReset.mockResolvedValue({});
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /envoyer le lien/i }));
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      await waitFor(() =>
        expect(passwordService.requestPasswordReset).toHaveBeenCalledWith('doctor@example.com')
      );
    });

    it('succès → message de confirmation affiché', async () => {
      passwordService.requestPasswordReset.mockResolvedValue({});
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /envoyer le lien/i }));
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      await waitFor(() =>
        expect(screen.getByText(/email envoyé/i)).toBeInTheDocument()
      );
    });

    it('échec → toastError', async () => {
      passwordService.requestPasswordReset.mockRejectedValue(new Error('SMTP down'));
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /envoyer le lien/i }));
      fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur', 'SMTP down')
      );
    });
  });

  describe('Fallback en cas d\'échec /auth/me/', () => {
    it('utilise getStoredUser quand /auth/me/ échoue', async () => {
      mockGet.mockRejectedValueOnce(new Error('401'));
      authService.getStoredUser.mockReturnValueOnce(authMeResponse());
      renderProfile();
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Jean Dupont' })).toBeInTheDocument()
      );
    });
  });
});
