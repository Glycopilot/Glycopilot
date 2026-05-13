import authService from '../authService';

// Axios mock: factory creates one stable instance used by authService at load time
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

// Capture the axios instance created by authService once at module load
const apiClient = authService.getApiClient();

// Use a plain store object and spy on Storage.prototype so that
// bare `localStorage` calls inside authService are intercepted.
let store = {};

beforeEach(() => {
  // resetMocks: true (set by react-scripts) resets all implementations —
  // re-apply localStorage spies and reset the store before each test.
  store = {};
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(key => store[key] ?? null);
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = String(val); });
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(key => { delete store[key]; });
  jest.spyOn(Storage.prototype, 'clear').mockImplementation(() => { store = {}; });
});

afterEach(() => {
  jest.restoreAllMocks();
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

      expect(store['access_token']).toBe('access-token');
      expect(store['refresh_token']).toBe('refresh-token');
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
    it('should clear storage after logout', async () => {
      store['access_token'] = 'tok';
      apiClient.post.mockResolvedValueOnce({});

      await authService.logout();

      expect(store['access_token']).toBeUndefined();
      expect(store['refresh_token']).toBeUndefined();
    });
  });

  describe('helper methods', () => {
    it('getTokens returns tokens from storage', () => {
      store['access_token'] = 'access';
      store['refresh_token'] = 'refresh';

      expect(authService.getTokens()).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });

    it('isAuthenticated is true when token present', () => {
      store['access_token'] = 'tok';
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('isAuthenticated is false when no token', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('getStoredUser returns user data', () => {
      store['user_id'] = '123';
      store['user_email'] = 'test@example.com';

      expect(authService.getStoredUser()).toEqual({ id_auth: '123', email: 'test@example.com' });
    });
  });
});
