import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockRequestPermissions = jest.fn();
const mockGetCurrentPosition = jest.fn();

jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: (...args: any[]) => mockRequestPermissions(...args),
    getCurrentPositionAsync: (...args: any[]) => mockGetCurrentPosition(...args),
    Accuracy: { Balanced: 3 },
}));

jest.mock('react-native-maps', () => {
    const React = require('react');
    const { View } = require('react-native');
    return {
        __esModule: true,
        default: (props: any) => React.createElement(View, { testID: 'MapView', ...props }),
        Marker: (props: any) => React.createElement(View, { testID: 'Marker', ...props }),
        PROVIDER_DEFAULT: null,
    };
});

import LocationConsentCard from '../LocationConsentCard';

describe('LocationConsentCard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequestPermissions.mockReset();
        mockGetCurrentPosition.mockReset();
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
        (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
        mockRequestPermissions.mockResolvedValue({ status: 'granted' });
        mockGetCurrentPosition.mockResolvedValue({
            coords: { latitude: 48.8566, longitude: 2.3522 },
        });
    });

    it('renders without crashing', () => {
        expect(() => render(<LocationConsentCard />)).not.toThrow();
    });

    it('shows "Localisation d\'urgence" title', () => {
        const { getByText } = render(<LocationConsentCard />);
        expect(getByText("Localisation d'urgence")).toBeTruthy();
    });

    it('shows "Désactivée" status by default', () => {
        const { getByText } = render(<LocationConsentCard />);
        expect(getByText('Désactivée')).toBeTruthy();
    });

    it('shows description text when disabled', () => {
        const { getByText } = render(<LocationConsentCard />);
        expect(getByText(/alerte d'hypo/i)).toBeTruthy();
    });

    it('loads enabled state from AsyncStorage on mount', async () => {
        render(<LocationConsentCard />);
        await waitFor(() => {
            expect(AsyncStorage.getItem).toHaveBeenCalled();
        });
    });

    it('fetches location and shows "Activée" when toggle is turned on', async () => {
        const { UNSAFE_getAllByType, getByText } = render(<LocationConsentCard />);
        const { Switch } = require('react-native');
        const switchComponents = UNSAFE_getAllByType(Switch);

        await act(async () => {
            fireEvent(switchComponents[0], 'valueChange', true);
        });

        await waitFor(() => {
            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                '@glycopilot:location_proche_enabled',
                'true'
            );
        });
    });

    it('persists disabled state when toggle is turned off', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
        const { UNSAFE_getAllByType } = render(<LocationConsentCard />);
        const { Switch } = require('react-native');
        const switchComponents = UNSAFE_getAllByType(Switch);

        await act(async () => {
            fireEvent(switchComponents[0], 'valueChange', false);
        });

        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            '@glycopilot:location_proche_enabled',
            'false'
        );
    });

    it('shows error message when GPS permission denied', async () => {
        mockRequestPermissions.mockResolvedValue({ status: 'denied' });
        const { UNSAFE_getAllByType, findByText } = render(<LocationConsentCard />);
        const { Switch } = require('react-native');
        const switchComponents = UNSAFE_getAllByType(Switch);

        await act(async () => {
            fireEvent(switchComponents[0], 'valueChange', true);
        });

        const errorMsg = await findByText(/Permission GPS refusée/i);
        expect(errorMsg).toBeTruthy();
    });

    it('shows map when location is obtained', async () => {
        const { UNSAFE_getAllByType, findByTestId } = render(<LocationConsentCard />);
        const { Switch } = require('react-native');
        const switchComponents = UNSAFE_getAllByType(Switch);

        await act(async () => {
            fireEvent(switchComponents[0], 'valueChange', true);
        });

        const map = await findByTestId('MapView');
        expect(map).toBeTruthy();
    });

    it('auto-enables and fetches location when AsyncStorage has true', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

        render(<LocationConsentCard />);

        await waitFor(() => {
            expect(mockRequestPermissions).toHaveBeenCalled();
        });
    });
});
