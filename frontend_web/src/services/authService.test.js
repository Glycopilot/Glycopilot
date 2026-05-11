import axios from 'axios';

// Mock axios BEFORE importing authService
jest.mock('axios', () => {
  const mockAxios = jest.fn(() => Promise.resolve({ data: {} }));
  mockAxios.create = jest.fn(() => mockAxios);
  mockAxios.interceptors = {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  };
  mockAxios.get = jest.fn();
  mockAxios.post = jest.fn();
  mockAxios.put = jest.fn();
  mockAxios.patch = jest.fn();
  mockAxios.delete = jest.fn();
  mockAxios.defaults = { headers: { common: {} } };
  return mockAxios;
});

import authService from './authService';

// Capture interceptors at module load time (before beforeEach clears them)
const requestInterceptor = axios.interceptors.request.use.mock.calls[0][0];
const responseInterceptorSuccess = axios.interceptors.response.use.mock.calls[0][0];
const responseInterceptorError = axios.interceptors.response.use.mock.calls[0][1];

describe('authService', () => {
  const mockUser = { id_auth: '1', email: 'test@test.com' };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  // ── login ────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('saves tokens and user on success', async () => {
      axios.post.mockResolvedValueOnce({
        data: { access: 'access123', refresh: 'refresh123', user: mockUser },
      });

      const result = await authService.login('test@test.com', 'password');
      expect(result.user).toEqual(mockUser);
      expect(localStorage.getItem('access_token')).toBe('access123');
      expect(localStorage.getItem('refresh_token')).toBe('refresh123');
      expect(localStorage.getItem('user_id')).toBe('1');
      expect(localStorage.getItem('user_email')).toBe('test@test.com');
    });

    it('throws ACCOUNT_PENDING error on non_field_errors', async () => {
      axios.post.mockRejectedValueOnce({
        response: { data: { non_field_errors: ['Compte en attente de validation'] } },
      });
      await expect(authService.login('a@b.com', 'pw')).rejects.toMatchObject({
        code: 'ACCOUNT_PENDING',
        message: 'Compte en attente de validation',
      });
    });

    it('throws generic error on API error', async () => {
      axios.post.mockRejectedValueOnce({
        response: { data: { error: 'Identifiants invalides' } },
      });
      await expect(authService.login('a@b.com', 'pw')).rejects.toThrow('Identifiants invalides');
    });

    it('throws default error when no error message in response', async () => {
      axios.post.mockRejectedValueOnce({ response: { data: {} } });
      await expect(authService.login('a@b.com', 'pw')).rejects.toThrow('Erreur de connexion');
    });
  });

  // ── register ─────────────────────────────────────────────────────────────
  describe('register', () => {
    const userData = {
      email: 'doc@test.com',
      firstName: 'John',
      lastName: 'Doe',
      password: 'pass123',
      passwordConfirm: 'pass123',
      role: 'DOCTOR',
      licenseNumber: 'LIC123',
      specialty: 'Cardio',
      medicalCenterAddress: 'Paris',
    };

    it('registers a doctor and saves tokens', async () => {
      axios.post.mockResolvedValueOnce({
        data: { access: 'acc', refresh: 'ref', user: mockUser },
      });
      const result = await authService.register(userData);
      expect(result.access).toBe('acc');
      expect(localStorage.getItem('access_token')).toBe('acc');
    });

    it('registers without tokens when not returned', async () => {
      axios.post.mockResolvedValueOnce({ data: {} });
      const result = await authService.register({ ...userData, role: 'PATIENT' });
      expect(result).toEqual({});
    });

    it('throws string error from response', async () => {
      axios.post.mockRejectedValueOnce({ response: { data: 'Email already exists' } });
      await expect(authService.register(userData)).rejects.toThrow('Email already exists');
    });

    it('throws error.response.data.error when present', async () => {
      axios.post.mockRejectedValueOnce({ response: { data: { error: 'Déjà inscrit' } } });
      await expect(authService.register(userData)).rejects.toThrow('Déjà inscrit');
    });

    it('throws stringified object when no known key', async () => {
      axios.post.mockRejectedValueOnce({
        response: { data: { email: ['Ce champ est requis.'] } },
      });
      await expect(authService.register(userData)).rejects.toThrow(/email/);
    });

    it('throws default message when no response data', async () => {
      axios.post.mockRejectedValueOnce({ response: {} });
      await expect(authService.register(userData)).rejects.toThrow("Erreur lors de l'inscription");
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('clears all localStorage keys', async () => {
      localStorage.setItem('access_token', 'tok');
      localStorage.setItem('refresh_token', 'ref');
      localStorage.setItem('user_id', '1');
      localStorage.setItem('user_email', 'a@b.com');
      localStorage.setItem('user', '{}');
      axios.post.mockResolvedValueOnce({ data: {} });

      const result = await authService.logout();
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(result.message).toBe('Déconnexion réussie');
    });

    it('clears storage even when API call fails', async () => {
      localStorage.setItem('access_token', 'tok');
      axios.post.mockRejectedValueOnce(new Error('Network error'));
      await authService.logout();
      expect(localStorage.getItem('access_token')).toBeNull();
    });

    it('skips API call when no token', async () => {
      await authService.logout();
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  // ── getCurrentUser ────────────────────────────────────────────────────────
  describe('getCurrentUser', () => {
    it('returns user data on success', async () => {
      axios.get.mockResolvedValueOnce({ data: mockUser });
      const result = await authService.getCurrentUser();
      expect(result).toEqual(mockUser);
    });

    it('throws error on failure', async () => {
      axios.get.mockRejectedValueOnce({
        response: { data: { detail: 'Non autorisé' } },
      });
      await expect(authService.getCurrentUser()).rejects.toThrow('Non autorisé');
    });

    it('throws default message when no detail', async () => {
      axios.get.mockRejectedValueOnce({ response: { data: {} } });
      await expect(authService.getCurrentUser()).rejects.toThrow(
        "Erreur lors de la récupération de l'utilisateur"
      );
    });
  });

  // ── refreshToken ──────────────────────────────────────────────────────────
  describe('refreshToken', () => {
    it('refreshes and saves new access token', async () => {
      localStorage.setItem('refresh_token', 'ref123');
      axios.post.mockResolvedValueOnce({ data: { access: 'new_access' } });
      const result = await authService.refreshToken();
      expect(localStorage.getItem('access_token')).toBe('new_access');
      expect(result.access).toBe('new_access');
    });

    it('throws when no refresh token in storage', async () => {
      await expect(authService.refreshToken()).rejects.toThrow('No refresh token available');
    });

    it('clears storage and throws on refresh failure', async () => {
      localStorage.setItem('refresh_token', 'ref');
      axios.post.mockRejectedValueOnce({ response: { data: { error: 'Token expiré' } } });
      await expect(authService.refreshToken()).rejects.toThrow('Token expiré');
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  // ── getTokens ─────────────────────────────────────────────────────────────
  describe('getTokens', () => {
    it('returns tokens from localStorage', () => {
      localStorage.setItem('access_token', 'acc');
      localStorage.setItem('refresh_token', 'ref');
      const tokens = authService.getTokens();
      expect(tokens.accessToken).toBe('acc');
      expect(tokens.refreshToken).toBe('ref');
    });

    it('returns nulls when no tokens', () => {
      const tokens = authService.getTokens();
      expect(tokens.accessToken).toBeNull();
      expect(tokens.refreshToken).toBeNull();
    });
  });

  // ── getStoredUser ─────────────────────────────────────────────────────────
  describe('getStoredUser', () => {
    it('returns user object when stored', () => {
      localStorage.setItem('user_id', '42');
      localStorage.setItem('user_email', 'x@y.com');
      const user = authService.getStoredUser();
      expect(user).toEqual({ id_auth: '42', email: 'x@y.com' });
    });

    it('returns null when no user_id', () => {
      expect(authService.getStoredUser()).toBeNull();
    });
  });

  // ── isAuthenticated ───────────────────────────────────────────────────────
  describe('isAuthenticated', () => {
    it('returns true when token exists', () => {
      localStorage.setItem('access_token', 'tok');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('returns false when no token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  // ── getApiClient ──────────────────────────────────────────────────────────
  it('getApiClient returns the axios instance', () => {
    const client = authService.getApiClient();
    expect(client).toBeDefined();
  });

  // ── Interceptors ─────────────────────────────────────────────────────────
  describe('interceptors', () => {
    it('request interceptor adds Authorization header', () => {
      localStorage.setItem('access_token', 'my-token');
      const config = { headers: {} };
      const result = requestInterceptor(config);
      
      expect(result.headers.Authorization).toBe('Bearer my-token');
    });

    it('request interceptor handles localStorage error', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Local storage blocked');
      });
      
      const config = { headers: {} };
      const result = requestInterceptor(config);
      
      expect(result.headers.Authorization).toBeUndefined();
      localStorage.getItem = originalGetItem;
    });

    it('response interceptor handles 401 and attempts refresh', async () => {
      const originalRequest = { headers: {}, _retry: false };
      const error = {
        response: { status: 401 },
        config: originalRequest
      };

      // Mock successful refresh
      localStorage.setItem('refresh_token', 'refresh123');
      axios.post.mockResolvedValueOnce({ data: { access: 'new-access-token' } });
      
      // The interceptor should call axios (apiClient) with the original request
      await responseInterceptorError(error);
      
      expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh/'), expect.any(Object));
      expect(originalRequest.headers.Authorization).toBe('Bearer new-access-token');
      expect(originalRequest._retry).toBe(true);
    });

    it('response interceptor redirects to login on refresh failure', async () => {
      // Mock window.location.href
      const originalLocation = window.location;
      delete window.location;
      window.location = { href: '' };

      const originalRequest = { headers: {}, _retry: false };
      const error = {
        response: { status: 401 },
        config: originalRequest
      };

      localStorage.setItem('refresh_token', 'refresh-bad');
      axios.post.mockRejectedValueOnce(new Error('Refresh failed'));
      
      try {
        await responseInterceptorError(error);
      } catch (e) {
        // Expected to reject
      }
      
      expect(window.location.href).toBe('/login');
      expect(localStorage.getItem('access_token')).toBeNull();
      window.location = originalLocation;
    });
  });

  describe('localStorage error handling', () => {
    it('getTokens handles errors gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Blocked');
      });
      const result = authService.getTokens();
      expect(result).toEqual({ accessToken: null, refreshToken: null });
      localStorage.getItem = originalGetItem;
    });

    it('getStoredUser handles errors gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Blocked');
      });
      const result = authService.getStoredUser();
      expect(result).toBeNull();
      localStorage.getItem = originalGetItem;
    });

    it('isAuthenticated handles errors gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => {
        throw new Error('Blocked');
      });
      const result = authService.isAuthenticated();
      expect(result).toBe(false);
      localStorage.getItem = originalGetItem;
    });
  });
});
