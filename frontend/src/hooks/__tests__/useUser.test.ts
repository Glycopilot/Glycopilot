import { renderHook, waitFor, act } from '@testing-library/react-native';
import useUser from '../useUser';
import authService from '../../services/authService';

// Mock authService
jest.mock('../../services/authService', () => ({
    getStoredUser: jest.fn(),
    getCurrentUser: jest.fn(),
}));

describe('useUser hook', () => {
    const mockUser = { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User' };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch user on mount from both storage and backend', async () => {
        (authService.getStoredUser as jest.Mock).mockResolvedValue(mockUser);
        (authService.getCurrentUser as jest.Mock).mockResolvedValue({ ...mockUser, firstName: 'Updated' });

        const { result } = renderHook(() => useUser());

        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.user?.firstName).toBe('Updated');
        expect(authService.getStoredUser).toHaveBeenCalled();
        expect(authService.getCurrentUser).toHaveBeenCalled();
    });

    it('should fallback to stored user if backend fails', async () => {
        (authService.getStoredUser as jest.Mock).mockResolvedValue(mockUser);
        (authService.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Backend error'));

        const { result } = renderHook(() => useUser());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.user).toEqual(mockUser);
        expect(result.current.error).toBeNull(); // Shoud not set error if storedUser exists
    });

    it('should set error if both fail', async () => {
        (authService.getStoredUser as jest.Mock).mockResolvedValue(null);
        (authService.getCurrentUser as jest.Mock).mockRejectedValue(new Error('Total failure'));

        const { result } = renderHook(() => useUser());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.user).toBeNull();
        expect(result.current.error).toBe('Total failure');
    });

    it('should allow manual refetch', async () => {
        (authService.getStoredUser as jest.Mock).mockResolvedValue(null);
        (authService.getCurrentUser as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(mockUser);

        const { result } = renderHook(() => useUser());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.user).toBeNull();

        await act(async () => {
            await result.current.refetch();
        });

        expect(result.current.user).toEqual(mockUser);
    });
});
