import { renderHook, act } from '@testing-library/react-native';
import { useLocation } from '../useLocation';
import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
    Accuracy: {
        Balanced: 'balanced',
    },
}));

describe('useLocation hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    it('should getCurrentLocation successfully', async () => {
        (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
        (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
            coords: { latitude: 48.8566, longitude: 2.3522 },
        });

        const { result } = renderHook(() => useLocation());

        let coords;
        await act(async () => {
            coords = await result.current.getCurrentLocation();
        });

        expect(coords).toEqual({ latitude: 48.8566, longitude: 2.3522 });
        expect(result.current.loading).toBe(false);
    });

    it('should throw error if permission denied', async () => {
        (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

        const { result } = renderHook(() => useLocation());

        await act(async () => {
            await expect(result.current.getCurrentLocation()).rejects.toThrow('Permission de localisation refusée');
        });

        expect(result.current.error).toBe('Permission de localisation refusée');
    });

    it('should handle reverseGeocode', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({
                features: [{ properties: { label: '123 Test St, Paris' } }]
            })
        });

        const { result } = renderHook(() => useLocation());

        let address;
        await act(async () => {
            address = await result.current.reverseGeocode(48.8566, 2.3522);
        });

        expect(address).toBe('123 Test St, Paris');
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('lat=48.8566'));
    });

    it('should return null if reverseGeocode finds nothing', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            json: jest.fn().mockResolvedValue({ features: [] })
        });

        const { result } = renderHook(() => useLocation());

        let address;
        await act(async () => {
            address = await result.current.reverseGeocode(0, 0);
        });

        expect(address).toBeNull();
    });
});
