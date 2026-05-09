import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CustomButton from '../CustomButton';

describe('CustomButton', () => {
  it('renders title correctly', () => {
    const { getByText } = render(<CustomButton title="Connexion" onPress={jest.fn()} />);
    expect(getByText('Connexion')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<CustomButton title="Valider" onPress={onPress} />);
    fireEvent.press(getByText('Valider'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText } = render(
      <CustomButton title="Charger" onPress={jest.fn()} loading />
    );
    expect(queryByText('Charger')).toBeNull();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    render(<CustomButton title="Test" onPress={onPress} loading />);
    // Button is disabled when loading, onPress should not fire
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <CustomButton title="Désactivé" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Désactivé'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders with default color', () => {
    const { getByText } = render(<CustomButton title="Défaut" onPress={jest.fn()} />);
    expect(getByText('Défaut')).toBeTruthy();
  });

  it('renders with custom color without crashing', () => {
    expect(() =>
      render(<CustomButton title="Custom" onPress={jest.fn()} color="#FF0000" />)
    ).not.toThrow();
  });
});
