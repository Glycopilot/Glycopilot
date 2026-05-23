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
jest.mock('../../services/franceAddressService', () => ({
  validateFrenchAddress: jest.fn(() => Promise.resolve({ valid: true })),
  fetchCommunesByPostalCode: jest.fn(() => Promise.resolve([{ code: '75101', name: 'Paris' }])),
  isValidPostalCodeFormat: jest.fn((code) => /^\d{5}$/.test(String(code || '').trim())),
  searchStreetAddresses: jest.fn(() => Promise.resolve([])),
}));
jest.mock('../../services/doctorProfileService', () => ({
  validateDoctorProfileForm: jest.fn(() => Promise.resolve(null)),
  saveDoctorProfile: jest.fn(),
  buildDoctorProfilePayload: jest.requireActual('../../services/doctorProfileService').buildDoctorProfilePayload,
}));

import ProfileScreen from '../../screens/ProfileScreen';
import { saveDoctorProfile, buildDoctorProfilePayload } from '../../services/doctorProfileService';
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
            specialty: 'Médecin',
            medical_center_name: 'Hôpital',
            medical_center_address: '1 rue Test, Paris',
            medical_center_postal_code: '75001',
            medical_center_city: 'Paris',
            user_details: { phone_number: '+33612345678' },
          },
        },
      ],
    },
    ...overrides,
  };
}

const renderProfile = () => render(<ProfileScreen />);

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const me = authMeResponse();
    mockGet.mockResolvedValue({ data: me });
    mockPatch.mockResolvedValue({ data: {} });
    mockGet.mockImplementation(() => Promise.resolve({ data: me }));
    saveDoctorProfile.mockImplementation(async (apiClient, form) => {
      await apiClient.patch('/users/me/', buildDoctorProfilePayload(form));
      return me;
    });
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

    it('affiche le titre Mon profil', async () => {
      renderProfile();
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Mon profil' })).toBeInTheDocument()
      );
    });
  });

  describe('Affichage des infos', () => {
    it('affiche le nom dans les champs', async () => {
      renderProfile();
      await waitFor(() => expect(screen.getByDisplayValue('Jean')).toBeInTheDocument());
      expect(screen.getByDisplayValue('Dupont')).toBeInTheDocument();
    });

    it('affiche la spécialité dans le sous-titre', async () => {
      renderProfile();
      await waitFor(() => screen.getByText(/Médecin · Hôpital/));
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
      expect(screen.getByDisplayValue('Médecin')).toBeDisabled();
    });
  });

  describe('Mode édition', () => {
    it('clic "Modifier" active les champs', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /^modifier$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
      expect(screen.getByDisplayValue('+33612345678')).not.toBeDisabled();
      expect(screen.getByDisplayValue('Médecin')).not.toBeDisabled();
    });

    it('"Annuler" restaure les valeurs initiales', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /^modifier$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
      const phoneInput = screen.getByDisplayValue('+33612345678');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '+33700000000');
      fireEvent.click(screen.getByRole('button', { name: /annuler/i }));
      expect(screen.getByDisplayValue('+33612345678')).toBeInTheDocument();
    });

    it('"Sauvegarder" appelle PATCH /users/me/ avec les champs modifiables', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /^modifier$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
      await waitFor(() => expect(screen.getByDisplayValue('+33612345678')).not.toBeDisabled());
      const phoneInput = screen.getByDisplayValue('+33612345678');
      await userEvent.clear(phoneInput);
      await userEvent.type(phoneInput, '+33700000000');
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
      await waitFor(() => expect(saveDoctorProfile).toHaveBeenCalled());
      expect(mockPatch).toHaveBeenCalledWith('/users/me/', expect.objectContaining({
        phone_number: '+33700000000',
        first_name: 'Jean',
        last_name: 'Dupont',
      }));
    });

    it('toastSuccess après sauvegarde réussie', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /^modifier$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
      fireEvent.click(document.querySelector('.btn-save'));
      await waitFor(() =>
        expect(toastSuccess).toHaveBeenCalledWith('Profil mis à jour', expect.any(String))
      );
    });

    it('toastError si PATCH /users/me/ échoue', async () => {
      saveDoctorProfile.mockRejectedValueOnce({ response: { data: { error: 'Téléphone invalide' } } });
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /^modifier$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
      fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));
      await waitFor(() =>
        expect(toastError).toHaveBeenCalledWith('Erreur', 'Téléphone invalide')
      );
    });

    it('sort du mode édition après sauvegarde réussie', async () => {
      renderProfile();
      await waitFor(() => screen.getByRole('button', { name: /^modifier$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^modifier$/i }));
      fireEvent.click(document.querySelector('.btn-save'));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /^modifier$/i })).toBeInTheDocument()
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
      authService.getStoredUser.mockReturnValue(authMeResponse());
      renderProfile();
      await waitFor(() =>
        expect(screen.getByDisplayValue('doctor@example.com')).toBeInTheDocument()
      );
    });
  });
});
