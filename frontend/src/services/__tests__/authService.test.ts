// Set environment variables BEFORE imports
process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../authService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

// Mock unregisterPushToken to avoid side effects
jest.mock('../pushService', () => ({
    unregisterPushToken: jest.fn().mockResolvedValue(undefined),
}));

describe('authService', () => {
    let mock: MockAdapter;
    let authMock: MockAdapter;
    const apiClient = authService.getApiClient();

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
        authMock = new MockAdapter(axios);
        jest.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
        authMock.restore();
    });

    describe('login', () => {
        it('should successfully login and store tokens', async () => {
            const loginData = {
                access: 'access-token',
                refresh: 'refresh-token',
                user: { id: '1', email: 'test@example.com' },
            };

            // Use regex to be flexible about absolute/relative URLs
            mock.onPost(/\/auth\/login/).reply(200, loginData);

            const result = await authService.login('test@example.com', 'password123');

            expect(result).toEqual(loginData);
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('access_token', 'access-token');
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(loginData.user));
        });

        it('should throw an error with backend message on login failure', async () => {
            // Mock on both to be safe
            mock.onPost(/\/auth\/login/).reply(401, { message: 'Identifiants invalides' });
            authMock.onPost(/\/auth\/login/).reply(401, { message: 'Identifiants invalides' });

            await expect(authService.login('wrong@email.com', 'password')).rejects.toThrow('Identifiants invalides');
        });
    });

    describe('logout', () => {
        it('should clear storage and call backend logout if refresh token exists', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue('refresh-token');
            mock.onPost(/\/auth\/logout/).reply(200);

            await authService.logout();

            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('access_token');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('refresh_token');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
        });

        it('should clear storage even if backend logout fails', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue('refresh-token');
            mock.onPost(/\/auth\/logout/).reply(500);

            await authService.logout();

            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('access_token');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('refresh_token');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
        });
    });

    describe('isAuthenticated', () => {
        it('should return true if access token exists', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue('token');
            const result = await authService.isAuthenticated();
            expect(result).toBe(true);
        });

        it('should return false if access token is missing', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
            const result = await authService.isAuthenticated();
            expect(result).toBe(false);
        });
    });

    describe('register', () => {
        it('should successfully register and store tokens', async () => {
            const registerData = {
                access: 'access-token',
                refresh: 'refresh-token',
                user: { id: '1', email: 'test@example.com' },
            };
            mock.onPost(/\/auth\/register/).reply(200, registerData);

            const result = await authService.register({
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                password: 'password123',
                passwordConfirm: 'password123'
            });

            expect(result).toEqual(registerData);
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('access_token', 'access-token');
        });

        it('should handle registration errors', async () => {
            mock.onPost(/\/auth\/register/).reply(400, { message: 'Email already exists' });

            await expect(authService.register({} as any)).rejects.toThrow('Email already exists');
        });

        it('should handle complex registration errors (objects)', async () => {
            mock.onPost(/\/auth\/register/).reply(400, { email: ['Invalid format'], password: ['Too short'] });

            await expect(authService.register({} as any)).rejects.toThrow(JSON.stringify({ email: ['Invalid format'], password: ['Too short'] }));
        });
    });

    describe('getCurrentUser', () => {
        it('should fetch and transform user data', async () => {
            const apiUser = {
                id_user: '1',
                email: 't@t.com',
                first_name: 'F',
                last_name: 'L',
                profiles: [{ role_name: 'patient', patient_details: { diabetes_type: 'type1' } }]
            };
            mock.onGet('/users/me/').reply(200, apiUser);

            const result = await authService.getCurrentUser();

            expect(result.firstName).toBe('F');
            expect(result.role).toBe('patient');
            expect(result.diabetesType).toBe('type1');
        });

        it('should throw error on fetch failure', async () => {
            mock.onGet('/users/me/').reply(500);
            await expect(authService.getCurrentUser()).rejects.toThrow();
        });
    });

    describe('updateProfile', () => {
        it('should update profile and local storage', async () => {
            const apiUser = { id_user: '1', first_name: 'New' };
            mock.onPatch('/users/me/').reply(200, apiUser);

            const result = await authService.updateProfile({ firstName: 'New' });

            expect(result.firstName).toBe('New');
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', expect.stringContaining('New'));
        });

        it('should throw error on update failure', async () => {
            mock.onPatch('/users/me/').reply(400, { message: 'Invalid data' });
            await expect(authService.updateProfile({})).rejects.toThrow('Invalid data');
        });
    });

    describe('refreshToken helper', () => {
        it('should refresh token and update storage', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue('old-refresh');
            authMock.onPost(/\/auth\/refresh/).reply(200, { access: 'new-access' });

            const result = await authService.refreshToken();

            expect(result.access).toBe('new-access');
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('access_token', 'new-access');
        });

        it('should clear storage and throw if no refresh token', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
            await expect(authService.refreshToken()).rejects.toThrow('Erreur lors du rafraîchissement du token');
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('access_token');
        });
    });

    describe('storage helpers', () => {
        it('getTokens should return tokens from storage', async () => {
            (AsyncStorage.getItem as jest.Mock)
                .mockResolvedValueOnce('at')
                .mockResolvedValueOnce('rt');

            const result = await authService.getTokens();
            expect(result).toEqual({ accessToken: 'at', refreshToken: 'rt' });
        });

        it('getStoredUser should parse user from storage', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ id: '1' }));
            const result = await authService.getStoredUser();
            expect(result).toEqual({ id: '1' });
        });

        it('getStoredUser should return null on error', async () => {
            (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
            const result = await authService.getStoredUser();
            expect(result).toBeNull();
        });
    });
});
