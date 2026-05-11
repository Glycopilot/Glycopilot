/**
 * @file userService.test.js
 * Tests de couverture pour userService.js
 */

// Mock authService avant l'import de userService
jest.mock('./authService', () => {
  const api = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  return {
    __esModule: true,
    default: { getApiClient: () => api },
  };
});

import userService from './userService';
import authService from './authService';

describe('userService', () => {
  let api;

  beforeEach(() => {
    jest.clearAllMocks();
    api = authService.getApiClient();
  });

  // ── getAllUsers ────────────────────────────────────────────────────────────
  describe('getAllUsers', () => {
    it('returns users list on success', async () => {
      const users = [{ id: 1 }, { id: 2 }];
      api.get.mockResolvedValueOnce({ data: users });
      const result = await userService.getAllUsers();
      expect(api.get).toHaveBeenCalledWith('/users/');
      expect(result).toEqual(users);
    });

    it('throws error.response.data.error on failure', async () => {
      api.get.mockRejectedValueOnce({ response: { data: { error: 'Non autorisé' } } });
      await expect(userService.getAllUsers()).rejects.toThrow('Non autorisé');
    });

    it('throws error.response.data.detail on failure', async () => {
      api.get.mockRejectedValueOnce({ response: { data: { detail: 'Forbidden' } } });
      await expect(userService.getAllUsers()).rejects.toThrow('Forbidden');
    });

    it('throws default message when no response data', async () => {
      api.get.mockRejectedValueOnce({ response: {} });
      await expect(userService.getAllUsers()).rejects.toThrow(
        'Erreur lors de la récupération des utilisateurs'
      );
    });
  });

  // ── getUserById ───────────────────────────────────────────────────────────
  describe('getUserById', () => {
    it('returns user on success', async () => {
      api.get.mockResolvedValueOnce({ data: { id: 5, email: 'a@b.com' } });
      const result = await userService.getUserById(5);
      expect(api.get).toHaveBeenCalledWith('/users/5/');
      expect(result.id).toBe(5);
    });

    it('throws on failure', async () => {
      api.get.mockRejectedValueOnce({ response: { data: { detail: 'Not found' } } });
      await expect(userService.getUserById(99)).rejects.toThrow('Not found');
    });

    it('throws default message when no data', async () => {
      api.get.mockRejectedValueOnce({ response: {} });
      await expect(userService.getUserById(1)).rejects.toThrow(
        "Erreur lors de la récupération de l'utilisateur"
      );
    });
  });

  // ── createPatient ─────────────────────────────────────────────────────────
  describe('createPatient', () => {
    const patientData = {
      email: 'p@test.com',
      username: 'ptnt',
      firstName: 'Paul',
      lastName: 'Dupont',
      password: 'pass',
      phone: '0600000000',
      dateOfBirth: '1990-01-01',
    };

    it('creates patient on success', async () => {
      api.post.mockResolvedValueOnce({ data: { id: 10 } });
      const result = await userService.createPatient(patientData);
      expect(api.post).toHaveBeenCalledWith('/users/', expect.objectContaining({
        email: 'p@test.com',
        role: 'patient',
      }));
      expect(result.id).toBe(10);
    });

    it('uses empty string for phone when omitted', async () => {
      api.post.mockResolvedValueOnce({ data: {} });
      await userService.createPatient({ ...patientData, phone: undefined, dateOfBirth: undefined });
      expect(api.post).toHaveBeenCalledWith('/users/', expect.objectContaining({
        phone: '',
        date_of_birth: null,
      }));
    });

    it('throws string error from response', async () => {
      api.post.mockRejectedValueOnce({ response: { data: 'Email already taken' } });
      await expect(userService.createPatient(patientData)).rejects.toThrow('Email already taken');
    });

    it('throws data.error when present', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { error: 'Duplicate entry' } } });
      await expect(userService.createPatient(patientData)).rejects.toThrow('Duplicate entry');
    });

    it('throws data.detail when present', async () => {
      api.post.mockRejectedValueOnce({ response: { data: { detail: 'Bad request' } } });
      await expect(userService.createPatient(patientData)).rejects.toThrow('Bad request');
    });

    it('throws formatted validation errors from object keys', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { email: ['This field is required.'], password: ['Too short.'] } },
      });
      await expect(userService.createPatient(patientData)).rejects.toThrow('email: This field is required.');
    });

    it('handles non-array field errors', async () => {
      api.post.mockRejectedValueOnce({
        response: { data: { email: 'Invalid format' } },
      });
      await expect(userService.createPatient(patientData)).rejects.toThrow('email: Invalid format');
    });

    it('throws default message when no response data', async () => {
      api.post.mockRejectedValueOnce({ response: {} });
      await expect(userService.createPatient(patientData)).rejects.toThrow(
        'Erreur lors de la création du patient'
      );
    });
  });

  // ── updateUser ────────────────────────────────────────────────────────────
  describe('updateUser', () => {
    it('updates user on success', async () => {
      api.patch.mockResolvedValueOnce({ data: { id: 1, firstName: 'Updated' } });
      const result = await userService.updateUser(1, { firstName: 'Updated' });
      expect(api.patch).toHaveBeenCalledWith('/users/1/', { firstName: 'Updated' });
      expect(result.firstName).toBe('Updated');
    });

    it('throws on failure', async () => {
      api.patch.mockRejectedValueOnce({ response: { data: { error: 'Échec' } } });
      await expect(userService.updateUser(1, {})).rejects.toThrow('Échec');
    });

    it('throws default message when no error key', async () => {
      api.patch.mockRejectedValueOnce({ response: {} });
      await expect(userService.updateUser(1, {})).rejects.toThrow(
        "Erreur lors de la mise à jour de l'utilisateur"
      );
    });
  });

  // ── deleteUser ────────────────────────────────────────────────────────────
  describe('deleteUser', () => {
    it('deletes user and returns message', async () => {
      api.delete.mockResolvedValueOnce({});
      const result = await userService.deleteUser(1);
      expect(api.delete).toHaveBeenCalledWith('/users/1/');
      expect(result.message).toBe('Utilisateur supprimé avec succès');
    });

    it('throws on failure', async () => {
      api.delete.mockRejectedValueOnce({ response: { data: { detail: 'Not found' } } });
      await expect(userService.deleteUser(99)).rejects.toThrow('Not found');
    });

    it('throws default message when no error data', async () => {
      api.delete.mockRejectedValueOnce({ response: {} });
      await expect(userService.deleteUser(1)).rejects.toThrow(
        "Erreur lors de la suppression de l'utilisateur"
      );
    });
  });

  // ── getAllPatients ─────────────────────────────────────────────────────────
  describe('getAllPatients', () => {
    it('fetches patients with role filter', async () => {
      api.get.mockResolvedValueOnce({ data: [{ id: 1, role: 'patient' }] });
      const result = await userService.getAllPatients();
      expect(api.get).toHaveBeenCalledWith('/users/?role=patient');
      expect(result[0].role).toBe('patient');
    });

    it('throws on failure', async () => {
      api.get.mockRejectedValueOnce({ response: { data: { error: 'Server error' } } });
      await expect(userService.getAllPatients()).rejects.toThrow('Server error');
    });

    it('throws default message when no error data', async () => {
      api.get.mockRejectedValueOnce({ response: {} });
      await expect(userService.getAllPatients()).rejects.toThrow(
        'Erreur lors de la récupération des patients'
      );
    });
  });

  // ── searchUsers ───────────────────────────────────────────────────────────
  describe('searchUsers', () => {
    it('searches users with query param', async () => {
      api.get.mockResolvedValueOnce({ data: [{ id: 2, email: 'a@b.com' }] });
      const result = await userService.searchUsers('dupont');
      expect(api.get).toHaveBeenCalledWith('/users/?search=dupont');
      expect(result.length).toBe(1);
    });

    it('throws on failure', async () => {
      api.get.mockRejectedValueOnce({ response: { data: { detail: 'Erreur' } } });
      await expect(userService.searchUsers('x')).rejects.toThrow('Erreur');
    });

    it('throws default message when no error data', async () => {
      api.get.mockRejectedValueOnce({ response: {} });
      await expect(userService.searchUsers('x')).rejects.toThrow(
        'Erreur lors de la recherche des utilisateurs'
      );
    });
  });
});
