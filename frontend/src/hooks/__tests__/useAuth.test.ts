import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from '../useAuth';
import authService from '../../services/authService';

// Mock authService
jest.mock('../../services/authService', () => ({
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
}));

describe('useAuth hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should initialize with default values', () => {
        const { result } = renderHook(() => useAuth());

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('');
    });

    it('should handle successful login', async () => {
        const mockResponse = { access: 'at', refresh: 'rt', user: { id: '1', email: 't@t.com' } };
        (authService.login as jest.Mock).mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useAuth());

        let loginResult;
        await act(async () => {
            loginResult = await result.current.login('t@t.com', 'pass');
        });

        expect(loginResult).toEqual(mockResponse);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe('');
    });

    it('should handle login failure', async () => {
        const error = new Error('Invalid credentials');
        (authService.login as jest.Mock).mockRejectedValue(error);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            try {
                await result.current.login('t@t.com', 'pass');
            } catch (e) {
                // Expected throw
            }
        });

        expect(result.current.error).toBe('Invalid credentials');
        expect(result.current.loading).toBe(false);
    });

    it('should handle logout', async () => {
        (authService.logout as jest.Mock).mockResolvedValue(undefined);

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.logout();
        });

        expect(authService.logout).toHaveBeenCalled();
        expect(result.current.loading).toBe(false);
    });

    it('should handle register', async () => {
        const mockResponse = { access: 'at', refresh: 'rt', user: { id: '1' } };
        (authService.register as jest.Mock).mockResolvedValue(mockResponse);

        const { result } = renderHook(() => useAuth());

        let regResult;
        await act(async () => {
            regResult = await result.current.register({ email: 't@t.com', password: 'p', firstName: 'f', lastName: 'l', passwordConfirm: 'p' });
        });

        expect(regResult).toEqual(mockResponse);
        expect(authService.register).toHaveBeenCalled();
    });
});
