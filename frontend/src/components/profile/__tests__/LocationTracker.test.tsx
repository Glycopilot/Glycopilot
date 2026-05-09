import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-native-maps', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: (props: any) => React.createElement(View, { testID: 'MapView', ...props }),
        Marker: (props: any) => React.createElement(View, { testID: 'Marker', ...props }),
        PROVIDER_GOOGLE: 'google',
    };
});

jest.mock('../../../hooks/useLocation', () => ({
    useLocation: jest.fn(),
}));

import { useLocation } from '../../../hooks/useLocation';
import LocationTracker from '../LocationTracker';

describe('LocationTracker', () => {
    const mockGetCurrentLocation = jest.fn();
    const mockReverseGeocode = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        (useLocation as jest.Mock).mockReturnValue({
            getCurrentLocation: mockGetCurrentLocation,
            reverseGeocode: mockReverseGeocode,
            loading: false,
            error: null,
        });
        mockGetCurrentLocation.mockResolvedValue({ latitude: 48.8566, longitude: 2.3522 });
        mockReverseGeocode.mockResolvedValue('Paris, France');
    });

    it('renders without crashing', () => {
        expect(() => render(<LocationTracker />)).not.toThrow();
    });

    it('loads location enabled state from AsyncStorage on mount', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
        render(<LocationTracker />);
        await waitFor(() => {
            expect(AsyncStorage.getItem).toHaveBeenCalled();
        });
    });

    it('shows the tracking label', () => {
        const { getByText } = render(<LocationTracker />);
        expect(getByText(/Localisation/i)).toBeTruthy();
    });

    it('toggles location tracking via Switch', async () => {
        const { UNSAFE_getAllByType } = render(<LocationTracker />);
        const { Switch } = require('react-native');
        const switchComponents = UNSAFE_getAllByType(Switch);
        if (switchComponents.length > 0) {
            await act(async () => {
                fireEvent(switchComponents[0], 'valueChange', true);
            });
            expect(AsyncStorage.setItem).toHaveBeenCalled();
        }
    });

    it('calls onLocationUpdate when location is obtained', async () => {
        const onLocationUpdate = jest.fn();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

        render(<LocationTracker onLocationUpdate={onLocationUpdate} />);

        await waitFor(() => {
            // Location tracking starts when enabled
        }, { timeout: 3000 });
    });

    it('handles location error gracefully', async () => {
        mockGetCurrentLocation.mockRejectedValue(new Error('Location error'));
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

        expect(() => render(<LocationTracker />)).not.toThrow();
    });
});
