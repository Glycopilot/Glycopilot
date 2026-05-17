jest.mock('axios', () => {
  const instance = jest.fn();
  Object.assign(instance, {
    interceptors: {
      request:  { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get:   jest.fn(),
    post:  jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  });
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => instance),
      post: jest.fn(),
      __instance: instance,
    },
  };
});

jest.mock('../../../lib/auth-redirect', () => ({
  triggerAuthRedirect: jest.fn(),
}));

import axios from 'axios';
import authService from '../../../services/authService';
import { triggerAuthRedirect } from '../../../lib/auth-redirect';

const apiClient = axios.create();
const requestInterceptor = apiClient.interceptors.request.use.mock.calls[0][0];
const requestErrorInterceptor = apiClient.interceptors.request.use.mock.calls[0][1];
const responseInterceptor = apiClient.interceptors.response.use.mock.calls[0][0];
const responseErrorInterceptor = apiClient.interceptors.response.use.mock.calls[0][1];

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  apiClient.mockReset();
});

describe('authService', () => {
  describe('intercepteurs axios', () => {
    it('l\'intercepteur request ajoute le bearer token', () => {
      localStorage.setItem('access_token', 'token-123');
      const config = requestInterceptor({ headers: {} });
      expect(config.headers.Authorization).toBe('Bearer token-123');
    });

    it('l\'intercepteur request tolère une erreur localStorage', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage blocked');
      });
      expect(requestInterceptor({ headers: {} })).toEqual({ headers: {} });
      getItem.mockRestore();
      consoleError.mockRestore();
    });

    it('l\'intercepteur request propage les erreurs de configuration', async () => {
      await expect(requestErrorInterceptor(new Error('bad config'))).rejects.toThrow('bad config');
    });

    it('l\'intercepteur response retourne les réponses réussies', () => {
      const response = { data: { ok: true } };
      expect(responseInterceptor(response)).toBe(response);
    });

    it('rejette les erreurs non 401 sans refresh', async () => {
      const error = { response: { status: 500 }, config: { headers: {} } };
      await expect(responseErrorInterceptor(error)).rejects.toBe(error);
    });

    it('purge la session si 401 sans refresh_token', async () => {
      localStorage.setItem('access_token', 'a');
      localStorage.setItem('user_id', 'u-1');
      const error = { response: { status: 401 }, config: { headers: {} } };

      await expect(responseErrorInterceptor(error)).rejects.toBe(error);

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('user_id')).toBeNull();
    });

    it('refresh le token, réessaie la requête originale et met à jour la queue', async () => {
      localStorage.setItem('refresh_token', 'refresh-1');
      axios.post.mockResolvedValueOnce({ data: { access: 'access-2' } });
      apiClient.mockResolvedValueOnce({ data: { retry: true } });
      const originalRequest = { headers: {}, url: '/private' };

      const result = await responseErrorInterceptor({
        response: { status: 401 },
        config: originalRequest,
      });

      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh/'), { refresh: 'refresh-1' });
      expect(localStorage.getItem('access_token')).toBe('access-2');
      expect(originalRequest._retry).toBe(true);
      expect(originalRequest.headers.Authorization).toBe('Bearer access-2');
      expect(apiClient).toHaveBeenCalledWith(originalRequest);
      expect(result).toEqual({ data: { retry: true } });
    });

    it('purge et déclenche la redirection si le refresh échoue', async () => {
      localStorage.setItem('access_token', 'a');
      localStorage.setItem('refresh_token', 'r');
      axios.post.mockRejectedValueOnce(new Error('refresh failed'));

      await expect(responseErrorInterceptor({
        response: { status: 401 },
        config: { headers: {} },
      })).rejects.toThrow('refresh failed');

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(triggerAuthRedirect).toHaveBeenCalled();
    });
  });

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

    it('utilise le message string renvoyé par le serveur', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: 'Inscription fermée' },
      });
      await expect(authService.register(baseUserData)).rejects.toThrow('Inscription fermée');
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

    it('getTokens retourne null/null si le storage est indisponible', () => {
      const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      expect(authService.getTokens()).toEqual({ accessToken: null, refreshToken: null });
      getItem.mockRestore();
    });

    it('getStoredUser retourne le JSON user stocké en priorité', () => {
      localStorage.setItem('user', JSON.stringify({ id_auth: 'u-json', email: 'json@test.com' }));
      localStorage.setItem('user_id', 'u-fallback');
      expect(authService.getStoredUser()).toEqual({ id_auth: 'u-json', email: 'json@test.com' });
    });

    it('getStoredUser retombe sur user_id si le JSON est invalide', () => {
      localStorage.setItem('user', '{bad json');
      localStorage.setItem('user_id', 'u-1');
      localStorage.setItem('user_email', 'doc@test.com');
      expect(authService.getStoredUser()).toEqual({ id_auth: 'u-1', email: 'doc@test.com' });
    });

    it('getStoredUser retourne null si le storage est indisponible', () => {
      const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      expect(authService.getStoredUser()).toBeNull();
      getItem.mockRestore();
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

    it('isAuthenticated retourne false si le storage est indisponible', () => {
      const getItem = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('blocked');
      });
      expect(authService.isAuthenticated()).toBe(false);
      getItem.mockRestore();
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
