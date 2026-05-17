import React from 'react';
import { Alert, Switch } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import LocationTracker from '../LocationTracker.web';
import { useLocation } from '../../../hooks/useLocation';

jest.mock('../../../hooks/useLocation');

const mockGetCurrentLocation = jest.fn();
const mockReverseGeocode = jest.fn();

function mockLocation(overrides = {}) {
  (useLocation as jest.Mock).mockReturnValue({
    getCurrentLocation: mockGetCurrentLocation,
    reverseGeocode: mockReverseGeocode,
    loading: false,
    error: null,
    ...overrides,
  });
}

describe('LocationTracker web', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockGetCurrentLocation.mockResolvedValue({ latitude: 48.8566, longitude: 2.3522 });
    mockReverseGeocode.mockResolvedValue('10 rue de Paris, Paris');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockLocation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('enables location tracking and reports the resolved address', async () => {
    const onLocationUpdate = jest.fn();
    const queries = render(<LocationTracker onLocationUpdate={onLocationUpdate} />);

    await act(async () => {
      fireEvent(queries.UNSAFE_getByType(Switch), 'valueChange', true);
    });

    await waitFor(() =>
      expect(queries.getByText('10 rue de Paris, Paris')).toBeTruthy()
    );
    expect(onLocationUpdate).toHaveBeenCalledWith(
      48.8566,
      2.3522,
      '10 rue de Paris, Paris'
    );
    expect(queries.getByText('48.856600, 2.352200')).toBeTruthy();
  });

  it('shows fallback address when reverse geocoding returns nothing', async () => {
    mockReverseGeocode.mockResolvedValueOnce('');
    const queries = render(<LocationTracker />);

    await act(async () => {
      fireEvent(queries.UNSAFE_getByType(Switch), 'valueChange', true);
    });

    await waitFor(() =>
      expect(queries.getByText('Adresse non disponible')).toBeTruthy()
    );
  });

  it('renders loading while enabled', () => {
    mockGetCurrentLocation.mockReturnValue(new Promise(() => {}));
    mockLocation({ loading: true, error: 'GPS refusé' });
    const queries = render(<LocationTracker />);

    fireEvent(queries.UNSAFE_getByType(Switch), 'valueChange', true);

    expect(queries.getByText('Récupération de la position...')).toBeTruthy();
  });

  it('renders hook errors while enabled', () => {
    mockGetCurrentLocation.mockReturnValue(new Promise(() => {}));
    mockLocation({ loading: false, error: 'GPS refusé' });
    const queries = render(<LocationTracker />);

    fireEvent(queries.UNSAFE_getByType(Switch), 'valueChange', true);

    expect(queries.getByText('GPS refusé')).toBeTruthy();
  });

  it('alerts and disables tracking when location lookup fails', async () => {
    mockGetCurrentLocation.mockRejectedValueOnce(new Error('Permission refusée'));
    const queries = render(<LocationTracker />);

    await act(async () => {
      fireEvent(queries.UNSAFE_getByType(Switch), 'valueChange', true);
    });

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Permission refusée')
    );
  });
});
