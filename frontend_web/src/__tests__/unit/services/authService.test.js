jest.mock('axios', () => {
  const instance = {
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get:   jest.fn(),
    post:  jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => instance),
      post: jest.fn(),
      __instance: instance,
    },
  };
});

import axios from 'axios';
import authService from '../../../services/authService';

const apiClient = axios.create();

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('authService', () => {
  describe('login', () => {
    it('stocke les tokens et infos user après succès', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          access:  'access-token',
          refresh: 'refresh-token',
          user:    { id_auth: 'u-1', email: 'doc@test.com' },
        },
      });
      const result = await authService.login('doc@test.com', 'Password1');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/login/', { email: 'doc@test.com', password: 'Password1' });
      expect(localStorage.getItem('access_token')).toBe('access-token');
      expect(localStorage.getItem('refresh_token')).toBe('refresh-token');
      expect(localStorage.getItem('user_id')).toBe('u-1');
      expect(localStorage.getItem('user_email')).toBe('doc@test.com');
      expect(result.access).toBe('access-token');
    });

    it('lève une erreur ACCOUNT_PENDING quand non_field_errors présent', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { non_field_errors: ['Licence en attente'] } },
      });
      await expect(authService.login('pending@test.com', 'Password1'))
        .rejects.toMatchObject({ code: 'ACCOUNT_PENDING', message: 'Licence en attente' });
    });

    it('lève une erreur classique avec le message du serveur', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { error: 'Identifiants invalides' } },
      });
      await expect(authService.login('x@y.z', 'bad'))
        .rejects.toThrow('Identifiants invalides');
    });

    it('utilise detail comme fallback', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { detail: 'Compte désactivé' } },
      });
      await expect(authService.login('x@y.z', 'bad'))
        .rejects.toThrow('Compte désactivé');
    });

    it('message générique si aucune information serveur', async () => {
      apiClient.post.mockRejectedValueOnce({ response: { data: {} } });
      await expect(authService.login('x@y.z', 'bad'))
        .rejects.toThrow('Erreur de connexion');
    });
  });

  describe('register', () => {
    const baseUserData = {
      email: 'jean@test.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      password: 'Password1',
      passwordConfirm: 'Password1',
      role: 'DOCTOR',
      licenseNumber: '10001234567',
      specialty: 'Cardiologue',
      medicalCenterAddress: '1 rue Test',
    };

    it('mappe camelCase → snake_case pour le payload', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { user: { id_auth: 'u-1', email: 'jean@test.com' } } });
      await authService.register(baseUserData);
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register/', expect.objectContaining({
        email: 'jean@test.com',
        first_name: 'Jean',
        last_name: 'Dupont',
        password: 'Password1',
        password_confirm: 'Password1',
        role: 'DOCTOR',
        license_number: '10001234567',
        specialty: 'Cardiologue',
        medical_center_address: '1 rue Test',
      }));
    });

    it('omet les champs DOCTOR pour un autre rôle', async () => {
      apiClient.post.mockResolvedValueOnce({ data: { user: { id_auth: 'u-2', email: 'x@y.z' } } });
      await authService.register({ ...baseUserData, role: 'PATIENT' });
      const payload = apiClient.post.mock.calls[0][1];
      expect(payload.license_number).toBeUndefined();
      expect(payload.specialty).toBeUndefined();
      expect(payload.medical_center_address).toBeUndefined();
    });

    it('stocke les tokens si la réponse les fournit', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          access:  'a',
          refresh: 'r',
          user:    { id_auth: 'u-1', email: 'jean@test.com' },
        },
      });
      await authService.register(baseUserData);
      expect(localStorage.getItem('access_token')).toBe('a');
      expect(localStorage.getItem('refresh_token')).toBe('r');
    });

    it('extrait error des erreurs de validation', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { error: 'Email déjà utilisé' } },
      });
      await expect(authService.register(baseUserData)).rejects.toThrow('Email déjà utilisé');
    });

    it('sérialise un payload de validation complexe en string', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { email: ['Cet email existe déjà'] } },
      });
      await expect(authService.register(baseUserData)).rejects.toThrow(/Cet email existe déjà/);
    });
  });

  describe('logout', () => {
    it('POST /auth/logout/ si access_token présent et purge le storage', async () => {
      localStorage.setItem('access_token', 'a');
      localStorage.setItem('refresh_token', 'r');
      localStorage.setItem('user_id', 'u-1');
      apiClient.post.mockResolvedValueOnce({ data: {} });

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout/');
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user_id')).toBeNull();
    });

    it('ne tente pas le POST si aucun access_token', async () => {
      await authService.logout();
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('purge même si le POST échoue', async () => {
      localStorage.setItem('access_token', 'a');
      apiClient.post.mockRejectedValueOnce(new Error('500'));
      await authService.logout();
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('utilise axios direct (pas l\'interceptor)', async () => {
      localStorage.setItem('refresh_token', 'r-token');
      axios.post.mockResolvedValueOnce({ data: { access: 'new-access' } });
      await authService.refreshToken();
      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh/'),
        { refresh: 'r-token' });
      expect(localStorage.getItem('access_token')).toBe('new-access');
    });

    it('lève une erreur si aucun refresh_token', async () => {
      await expect(authService.refreshToken()).rejects.toThrow('No refresh token');
    });

    it('purge le storage si le refresh échoue', async () => {
      localStorage.setItem('access_token', 'a');
      localStorage.setItem('refresh_token', 'r');
      axios.post.mockRejectedValueOnce({ response: { data: { error: 'Token expiré' } } });
      await expect(authService.refreshToken()).rejects.toThrow('Token expiré');
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });

  describe('helpers de session', () => {
    it('getTokens retourne les valeurs du storage', () => {
      localStorage.setItem('access_token', 'a');
      localStorage.setItem('refresh_token', 'r');
      expect(authService.getTokens()).toEqual({ accessToken: 'a', refreshToken: 'r' });
    });

    it('getStoredUser retourne null si pas de user_id', () => {
      expect(authService.getStoredUser()).toBeNull();
    });

    it('getStoredUser retourne id_auth et email depuis le storage', () => {
      localStorage.setItem('user_id', 'u-1');
      localStorage.setItem('user_email', 'doc@test.com');
      expect(authService.getStoredUser()).toEqual({ id_auth: 'u-1', email: 'doc@test.com' });
    });

    it('isAuthenticated reflète la présence du token', () => {
      expect(authService.isAuthenticated()).toBe(false);
      localStorage.setItem('access_token', 'a');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('getApiClient retourne toujours la même instance', () => {
      expect(authService.getApiClient()).toBe(authService.getApiClient());
    });
  });

  describe('getCurrentUser', () => {
    it('GET /auth/me/ et retourne les données', async () => {
      apiClient.get.mockResolvedValueOnce({ data: { email: 'doc@test.com' } });
      const data = await authService.getCurrentUser();
      expect(apiClient.get).toHaveBeenCalledWith('/auth/me/');
      expect(data.email).toBe('doc@test.com');
    });

    it('propage le message d\'erreur du serveur', async () => {
      apiClient.get.mockRejectedValueOnce({ response: { data: { detail: 'Non authentifié' } } });
      await expect(authService.getCurrentUser()).rejects.toThrow('Non authentifié');
    });
  });
});
