import { getDeviceLocation } from '../getDeviceLocation';

const mockRequestPermissions = jest.fn();
const mockGetCurrentPosition = jest.fn();

jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: (...args: any[]) => mockRequestPermissions(...args),
    getCurrentPositionAsync: (...args: any[]) => mockGetCurrentPosition(...args),
    Accuracy: { Balanced: 3 },
}));

import * as Location from 'expo-location';

describe('getDeviceLocation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequestPermissions.mockReset();
        mockGetCurrentPosition.mockReset();
    });

    it('returns lat/lng when permission granted and location available', async () => {
        mockRequestPermissions.mockResolvedValue({ status: 'granted' });
        mockGetCurrentPosition.mockResolvedValue({
            coords: { latitude: 48.8566, longitude: 2.3522 },
        });

        const result = await getDeviceLocation();

        expect(result).toEqual({ lat: 48.8566, lng: 2.3522 });
    });

    it('returns null when permission denied', async () => {
        mockRequestPermissions.mockResolvedValue({ status: 'denied' });

        const result = await getDeviceLocation();

        expect(result).toBeNull();
        expect(mockGetCurrentPosition).not.toHaveBeenCalled();
    });

    it('returns null when getCurrentPositionAsync throws', async () => {
        mockRequestPermissions.mockResolvedValue({ status: 'granted' });
        mockGetCurrentPosition.mockRejectedValue(new Error('GPS unavailable'));

        const result = await getDeviceLocation();

        expect(result).toBeNull();
    });

    it('returns null when requestForegroundPermissionsAsync throws', async () => {
        mockRequestPermissions.mockRejectedValue(new Error('permission error'));

        const result = await getDeviceLocation();

        expect(result).toBeNull();
    });

    it('calls getCurrentPositionAsync with Balanced accuracy', async () => {
        mockRequestPermissions.mockResolvedValue({ status: 'granted' });
        mockGetCurrentPosition.mockResolvedValue({
            coords: { latitude: 0, longitude: 0 },
        });

        await getDeviceLocation();

        expect(mockGetCurrentPosition).toHaveBeenCalledWith({
            accuracy: Location.Accuracy.Balanced,
        });
    });
});
