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
    default: {
      create: jest.fn(() => mockInstance),
      post: jest.fn(),
    },
    create: jest.fn(() => mockInstance),
    post: jest.fn(),
  };
});

describe('authService', () => {
  const mockStorage = {};
  let apiClient;

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => mockStorage[key] || null),
        setItem: jest.fn((key, value) => { mockStorage[key] = value; }),
        removeItem: jest.fn((key) => { delete mockStorage[key]; }),
        clear: jest.fn(() => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }),
      },
      writable: true,
    });
    delete window.location;
    window.location = { href: '' };
    // authService.getApiClient() returns the single mocked axios instance
    apiClient = authService.getApiClient();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: { id_auth: '123', email: 'test@example.com' },
        },
      });

      const result = await authService.login('test@example.com', 'password');

      expect(result.access).toBe('access-token');
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
    it('should register successfully', async () => {
      apiClient.post.mockResolvedValueOnce({
        data: {
          access: 'access-token',
          refresh: 'refresh-token',
          user: { id_auth: '123', email: 'test@example.com' },
        },
      });

      const result = await authService.register({
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

      expect(result.access).toBe('access-token');
      expect(apiClient.post).toHaveBeenCalledWith('/auth/register/', expect.objectContaining({
        email: 'test@example.com',
        license_number: '12345',
      }));
    });
  });

  describe('logout', () => {
    it('should clear storage on logout', async () => {
      apiClient.post.mockResolvedValueOnce({});
      window.localStorage.setItem('access_token', 'token');

      await authService.logout();

      expect(window.localStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(window.localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('helper methods', () => {
    it('should return tokens from storage', () => {
      window.localStorage.setItem('access_token', 'access');
      window.localStorage.setItem('refresh_token', 'refresh');

      const tokens = authService.getTokens();
      expect(tokens).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
    });

    it('should check authentication status', () => {
      window.localStorage.setItem('access_token', 'access');
      expect(authService.isAuthenticated()).toBe(true);

      window.localStorage.removeItem('access_token');
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return stored user', () => {
      window.localStorage.setItem('user_id', '123');
      window.localStorage.setItem('user_email', 'test@example.com');

      const user = authService.getStoredUser();
      expect(user).toEqual({ id_auth: '123', email: 'test@example.com' });
    });
  });
});
