import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { API_URL } from '../apiClient';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
}));

describe('apiClient', () => {
    let mock: MockAdapter;
    let authMock: MockAdapter;

    beforeEach(() => {
        // Mock the apiClient instance
        mock = new MockAdapter(apiClient);
        // Also mock global axios because apiClient calls axios.post directly for refresh
        authMock = new MockAdapter(axios);
        jest.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
        authMock.restore();
    });

    it('should have the correct baseURL', () => {
        expect(apiClient.defaults.baseURL).toBe(API_URL);
    });

    it('should add Authorization header if token exists', async () => {
        const token = 'fake-token';
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(token);

        // Use absolute URL to avoid "Invalid URL" errors in some axios adapters
        mock.onGet(`${API_URL}/test`).reply(200, { success: true });

        const response = await apiClient.get('/test');

        expect(response.config.headers.Authorization).toBe(`Bearer ${token}`);
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('access_token');
    });

    it('should NOT add Authorization header if token is missing', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

        mock.onGet(`${API_URL}/test`).reply(200, { success: true });

        const response = await apiClient.get('/test');

        expect(response.config.headers.Authorization).toBeUndefined();
    });

    it('should handle token refresh on 401 error', async () => {
        const oldToken = 'old-token';
        const newToken = 'new-token';
        const refreshToken = 'refresh-token';

        let currentToken = oldToken;
        (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
            if (key === 'access_token') return Promise.resolve(currentToken);
            if (key === 'refresh_token') return Promise.resolve(refreshToken);
            return Promise.resolve(null);
        });
        (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
            if (key === 'access_token') currentToken = value;
            return Promise.resolve();
        });

        // Mock first request failure (401)
        mock.onGet(`${API_URL}/protected`).replyOnce(401);

        // Mock refresh request success using the GLOBAL axios mock
        authMock.onPost(`${API_URL}/auth/refresh`).reply(200, { access: newToken });

        // Mock second request (retry) success
        mock.onGet(`${API_URL}/protected`).reply(200, { data: 'secret' });

        const response = await apiClient.get('/protected');

        expect(response.data).toEqual({ data: 'secret' });
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('access_token', newToken);
        expect(response.config.headers.Authorization).toBe(`Bearer ${newToken}`);
    });

    it('should logout user on refresh failure', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('some-token');

        // Mock first request failure (401)
        mock.onGet(`${API_URL}/protected`).replyOnce(401);

        // Mock refresh request failure
        mock.onPost(`${API_URL}/auth/refresh`).reply(403);

        await expect(apiClient.get('/protected')).rejects.toThrow();

        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('access_token');
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
});
