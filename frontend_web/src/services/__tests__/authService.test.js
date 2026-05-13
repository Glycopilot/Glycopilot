import authService from '../authService';

jest.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    post: jest.fn(),
    get: jest.fn(),
  };
  return {
    __esModule: true,
    default: { create: jest.fn(() => mockInstance), post: jest.fn() },
    create: jest.fn(() => mockInstance),
    post: jest.fn(),
  };
});

// Capture the axios instance that authService created at load time
const apiClient = authService.getApiClient();

const mockStorage = {};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key) => mockStorage[key] ?? null),
      setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
      removeItem: jest.fn((key) => { delete mockStorage[key]; }),
      clear: jest.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
    },
    writable: true,
  });
  delete window.location;
  window.location = { href: '' };
});

beforeEach(() => {
  apiClient.post.mockClear();
  apiClient.get.mockClear();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
});

describe('authService', () => {
  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: { id_auth: '123', email: 'test@example.com' },
        },
      });

      await authService.login('test@example.com', 'password');

      expect(window.localStorage.setItem).toHaveBeenCalledWith('access_token', 'access-token');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
    });

    it('should throw error on login failure', async () => {
      apiClient.post.mockRejectedValueOnce({
        response: { data: { error: 'Invalid credentials' } },
      });

      await expect(authService.login('test@example.com', 'wrong'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should register a doctor with license fields', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: { id_auth: '123', email: 'test@example.com' },
        },
      });

      await authService.register({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: 'password',
        passwordConfirm: 'password',
        role: 'DOCTOR',
        licenseNumber: '12345',
        specialty: 'General',
        medicalCenterAddress: '123 St',
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/register/',
        expect.objectContaining({ license_number: '12345', email: 'test@example.com' }),
      );
    });
  });

  describe('logout', () => {
    it('should clear storage', async () => {
      mockStorage['access_token'] = 'tok';
      apiClient.post.mockResolvedValueOnce({});

      await authService.logout();

      expect(window.localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('helper methods', () => {
    it('getTokens returns tokens from storage', () => {
      mockStorage['access_token'] = 'access';
      mockStorage['refresh_token'] = 'refresh';

      expect(authService.getTokens()).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });

    it('isAuthenticated is true when token present', () => {
      mockStorage['access_token'] = 'tok';
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated is false when no token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('getStoredUser returns user data', () => {
      mockStorage['user_id'] = '123';
      mockStorage['user_email'] = 'test@example.com';

      expect(authService.getStoredUser()).toEqual({ id_auth: '123', email: 'test@example.com' });
    });
  });
});
