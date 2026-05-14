jest.mock('../../../services/authService', () => {
  const apiClient = { get: jest.fn(), post: jest.fn() };
  return {
    __esModule: true,
    default: { getApiClient: () => apiClient },
  };
});

import authService from '../../../services/authService';
import passwordService from '../../../services/passwordService';

const apiClient = authService.getApiClient();

beforeEach(() => jest.clearAllMocks());

describe('passwordService', () => {
  describe('requestPasswordReset', () => {
    it('POST /password_reset/ avec l\'email', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { status: 'OK' } });
      const res = await passwordService.requestPasswordReset('doc@test.com');
      expect(apiClient.post).toHaveBeenCalledWith('/password_reset/', { email: 'doc@test.com' });
      expect(res.status).toBe('OK');
    });

    it('propage error du serveur', async () => {
      apiClient.post.mockRejectedValueOnce({ response: { data: { error: 'Compte introuvable' } } });
      await expect(passwordService.requestPasswordReset('x@y.z'))
        .rejects.toThrow('Compte introuvable');
    });

    it('utilise detail comme fallback', async () => {
      apiClient.post.mockRejectedValueOnce({ response: { data: { detail: 'Email requis' } } });
      await expect(passwordService.requestPasswordReset('')).rejects.toThrow('Email requis');
    });

    it('utilise email[0] si validation field-level', async () => {
      apiClient.post.mockRejectedValueOnce({ response: { data: { email: ['Adresse invalide'] } } });
      await expect(passwordService.requestPasswordReset('pasunemail'))
        .rejects.toThrow('Adresse invalide');
    });

    it('message générique si aucune information', async () => {
      apiClient.post.mockRejectedValueOnce({ response: { data: {} } });
      await expect(passwordService.requestPasswordReset('x@y.z'))
        .rejects.toThrow(/réinitialisation/i);
    });
  });

  describe('confirmPasswordReset', () => {
    it('POST /password_reset/confirm/ avec token et password', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { status: 'OK' } });
      await passwordService.confirmPasswordReset('tok-123', 'NewPass1');
      expect(apiClient.post).toHaveBeenCalledWith('/password_reset/confirm/', {
        token: 'tok-123',
        password: 'NewPass1',
      });
    });

    it('propage l\'erreur de validation du token', async () => {
      apiClient.post.mockRejectedValueOnce({ response: { data: { token: ['Token expiré'] } } });
      await expect(passwordService.confirmPasswordReset('bad', 'NewPass1'))
        .rejects.toThrow('Token expiré');
    });

    it('propage l\'erreur de validation du mot de passe', async () => {
      apiClient.post.mockRejectedValueOnce({ response: { data: { password: ['Trop court'] } } });
      await expect(passwordService.confirmPasswordReset('tok', 'x'))
        .rejects.toThrow('Trop court');
    });
  });

  describe('validatePasswordResetToken', () => {
    it('POST /password_reset/validate_token/', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { status: 'OK' } });
      await passwordService.validatePasswordResetToken('tok-123');
      expect(apiClient.post).toHaveBeenCalledWith('/password_reset/validate_token/', { token: 'tok-123' });
    });

    it('lève "Token invalide ou expiré" par défaut', async () => {
      apiClient.post.mockRejectedValueOnce({ response: { data: {} } });
      await expect(passwordService.validatePasswordResetToken('bad'))
        .rejects.toThrow('Token invalide ou expiré');
    });
  });
});
