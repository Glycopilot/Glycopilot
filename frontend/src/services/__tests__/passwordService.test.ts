import MockAdapter from 'axios-mock-adapter';
import authService from '../authService';
import passwordService from '../passwordService';

describe('passwordService', () => {
    let mock: MockAdapter;
    const apiClient = authService.getApiClient();

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
    });

    describe('requestPasswordReset', () => {
        it('should return success response on success', async () => {
            const mockResponse = { status: 'OK' };
            mock.onPost('/password_reset/').reply(200, mockResponse);

            const result = await passwordService.requestPasswordReset('test@email.com');

            expect(result).toEqual(mockResponse);
            expect(JSON.parse(mock.history.post[0].data)).toEqual({ email: 'test@email.com' });
        });

        it('should throw error on failure with backend message', async () => {
            mock.onPost('/password_reset/').reply(400, { detail: 'Internal Error' });

            await expect(passwordService.requestPasswordReset('test@email.com')).rejects.toThrow('Internal Error');
        });

        it('should handle array format error messages', async () => {
            mock.onPost('/password_reset/').reply(400, { email: ['Invalid email format'] });

            await expect(passwordService.requestPasswordReset('wrong')).rejects.toThrow('Invalid email format');
        });
    });

    describe('confirmPasswordReset', () => {
        it('should confirm on success', async () => {
            mock.onPost('/password_reset/confirm/').reply(200, { status: 'OK' });

            await passwordService.confirmPasswordReset('token123', 'newpass');

            expect(mock.history.post[0].url).toBe('/password_reset/confirm/');
            expect(JSON.parse(mock.history.post[0].data)).toEqual({ token: 'token123', password: 'newpass' });
        });

        it('should handle token errors', async () => {
            mock.onPost('/password_reset/confirm/').reply(400, { token: ['Invalid token'] });

            await expect(passwordService.confirmPasswordReset('bad', 'pass')).rejects.toThrow('Invalid token');
        });
    });

    describe('validatePasswordResetToken', () => {
        it('should return status on success', async () => {
            mock.onPost('/password_reset/validate_token/').reply(200, { status: 'OK' });

            const result = await passwordService.validatePasswordResetToken('valid-token');

            expect(result).toEqual({ status: 'OK' });
        });

        it('should throw default error if no message from backend', async () => {
            mock.onPost('/password_reset/validate_token/').reply(400, {});

            await expect(passwordService.validatePasswordResetToken('invalid')).rejects.toThrow('Token invalide ou expiré');
        });
    });
});
