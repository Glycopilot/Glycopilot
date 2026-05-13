import passwordService from '../passwordService';
import authService from '../authService';

jest.mock('../authService', () => {
  const getApiClient = jest.fn(() => ({
    post: jest.fn(),
  }));
  return {
    __esModule: true,
    default: { getApiClient },
    getApiClient,
  };
});

describe('passwordService', () => {
  let mockApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockApiClient = authService.getApiClient();
  });

  describe('requestPasswordReset', () => {
    it('should request reset successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { status: 'OK' } });
      const result = await passwordService.requestPasswordReset('test@example.com');
      expect(result).toEqual({ status: 'OK' });
      expect(mockApiClient.post).toHaveBeenCalledWith('/password_reset/', { email: 'test@example.com' });
    });

    it('should throw error on failure', async () => {
      mockApiClient.post.mockRejectedValueOnce({
        response: { data: { email: ['Invalid email'] } }
      });
      await expect(passwordService.requestPasswordReset('test@example.com'))
        .rejects.toThrow('Invalid email');
    });
  });

  describe('confirmPasswordReset', () => {
    it('should confirm reset successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { status: 'OK' } });
      const result = await passwordService.confirmPasswordReset('token123', 'newPass123');
      expect(result).toEqual({ status: 'OK' });
      expect(mockApiClient.post).toHaveBeenCalledWith('/password_reset/confirm/', {
        token: 'token123',
        password: 'newPass123'
      });
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should validate token successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { status: 'OK' } });
      const result = await passwordService.validatePasswordResetToken('token123');
      expect(result).toEqual({ status: 'OK' });
      expect(mockApiClient.post).toHaveBeenCalledWith('/password_reset/validate_token/', { token: 'token123' });
    });
  });
});
