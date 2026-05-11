/**
 * @file passwordService.test.js
 * Tests complets pour passwordService.js
 */
jest.mock('./authService', () => {
  const api = { post: jest.fn() };
  return {
    __esModule: true,
    default: { getApiClient: () => api },
  };
});

import passwordService from './passwordService';
import authService from './authService';

describe('passwordService', () => {
  let api;

  beforeEach(() => {
    jest.clearAllMocks();
    api = authService.getApiClient();
  });

  // ── requestPasswordReset ──────────────────────────────────────────────────
  describe('requestPasswordReset', () => {
    it('calls API and returns response data', async () => {
      api.post.mockResolvedValueOnce({ data: { status: 'OK' } });
      const result = await passwordService.requestPasswordReset('test@test.com');
      expect(api.post).toHaveBeenCalledWith('/password_reset/', { email: 'test@test.com' });
      expect(result.status).toBe('OK');
    });

    it('throws error.response.data.error on failure', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { error: 'Email introuvable' } } });
      await expect(passwordService.requestPasswordReset('x@x.com')).rejects.toThrow('Email introuvable');
    });

    it('throws error.response.data.detail on failure', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { detail: 'Not found' } } });
      await expect(passwordService.requestPasswordReset('x@x.com')).rejects.toThrow('Not found');
    });

    it('throws error.response.data.email[0] on failure', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { email: ['Email invalide'] } } });
      await expect(passwordService.requestPasswordReset('bad')).rejects.toThrow('Email invalide');
    });

    it('throws default message when no specific error', async () => {
      api.post.mockRejectedValueOnce({ response: { data: {} } });
      await expect(passwordService.requestPasswordReset('x@x.com')).rejects.toThrow(
        'Erreur lors de la demande de réinitialisation'
      );
    });
  });

  // ── confirmPasswordReset ──────────────────────────────────────────────────
  describe('confirmPasswordReset', () => {
    it('calls API with token and new password', async () => {
      api.post.mockResolvedValueOnce({ data: { status: 'Password changed' } });
      const result = await passwordService.confirmPasswordReset('tok123', 'newPass!');
      expect(api.post).toHaveBeenCalledWith('/password_reset/confirm/', {
        token: 'tok123',
        password: 'newPass!',
      });
      expect(result.status).toBe('Password changed');
    });

    it('throws data.error on failure', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { error: 'Token invalide' } } });
      await expect(passwordService.confirmPasswordReset('bad', 'pw')).rejects.toThrow('Token invalide');
    });

    it('throws data.detail on failure', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { detail: 'Forbidden' } } });
      await expect(passwordService.confirmPasswordReset('bad', 'pw')).rejects.toThrow('Forbidden');
    });

    it('throws data.token[0] on failure', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { token: ['Token expiré'] } } });
      await expect(passwordService.confirmPasswordReset('bad', 'pw')).rejects.toThrow('Token expiré');
    });

    it('throws data.password[0] on failure', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { password: ['Trop court'] } } });
      await expect(passwordService.confirmPasswordReset('tok', 'pw')).rejects.toThrow('Trop court');
    });

    it('throws default message when no specific error', async () => {
      api.post.mockRejectedValueOnce({ response: { data: {} } });
      await expect(passwordService.confirmPasswordReset('tok', 'pw')).rejects.toThrow(
        'Erreur lors de la réinitialisation du mot de passe'
      );
    });
  });

  // ── validatePasswordResetToken ────────────────────────────────────────────
  describe('validatePasswordResetToken', () => {
    it('validates token successfully', async () => {
      api.post.mockResolvedValueOnce({ data: { status: 'OK' } });
      const result = await passwordService.validatePasswordResetToken('tok123');
      expect(api.post).toHaveBeenCalledWith('/password_reset/validate_token/', { token: 'tok123' });
      expect(result.status).toBe('OK');
    });

    it('throws data.error on failure', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { error: 'Invalide' } } });
      await expect(passwordService.validatePasswordResetToken('bad')).rejects.toThrow('Invalide');
    });

    it('throws data.detail on failure', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { detail: 'Expired' } } });
      await expect(passwordService.validatePasswordResetToken('bad')).rejects.toThrow('Expired');
    });

    it('throws default message when no specific error', async () => {
      api.post.mockRejectedValueOnce({ response: { data: {} } });
      await expect(passwordService.validatePasswordResetToken('bad')).rejects.toThrow(
        'Token invalide ou expiré'
      );
    });
  });
});
