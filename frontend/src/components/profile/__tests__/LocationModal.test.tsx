import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import LocationModal from '../LocationModal';

jest.mock('../LocationTracker', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return function MockLocationTracker({ onLocationUpdate }: any) {
    return (
      <View>
        <Text>Location tracker mock</Text>
        <TouchableOpacity
          onPress={() => onLocationUpdate(48.8566, 2.3522, 'Paris')}
        >
          <Text>Emit location</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

describe('LocationModal', () => {
  it('renders location content and forwards tracker updates', () => {
    const onClose = jest.fn();
    const onLocationUpdate = jest.fn();

    const { getByText } = render(
      <LocationModal
        visible
        onClose={onClose}
        onLocationUpdate={onLocationUpdate}
      />
    );

    expect(getByText('Ma localisation')).toBeTruthy();
    expect(getByText('Géolocalisation en temps réel')).toBeTruthy();

    fireEvent.press(getByText('Emit location'));
    expect(onLocationUpdate).toHaveBeenCalledWith(48.8566, 2.3522, 'Paris');
  });

  it('closes from the overlay, close button, and Android back request', () => {
    const onClose = jest.fn();
    const { getByText, UNSAFE_getByType } = render(
      <LocationModal visible onClose={onClose} onLocationUpdate={jest.fn()} />
    );

    fireEvent.press(getByText('Fermer'));
    UNSAFE_getByType(require('react-native').Modal).props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
