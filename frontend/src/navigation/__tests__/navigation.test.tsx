import React from 'react';
import { render, act } from '@testing-library/react-native';
import AppNavigator from '../navigation';
import { navigate } from '../navigationRef';

// Éviter de charger react-native-maps via les composants de profil
jest.mock('../../components/profile/LocationModal', () => {
  return function MockLocationModal() {
    return null;
  };
});

jest.mock('../../components/profile/LocationTracker', () => {
  return function MockLocationTracker() {
    return null;
  };
});

describe('AppNavigator', () => {
  it('renders Login screen by default and can navigate to Home', () => {
    const { getByText } = render(<AppNavigator />);

    // Par défaut, on est sur l'écran de login
    expect(getByText(/Se connecter/i)).toBeTruthy();

    act(() => {
      navigate('Home');
    });

    expect(getByText('Dashboard')).toBeTruthy();
  });
});

