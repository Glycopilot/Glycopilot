import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ActionButton from '../ActionButton';

describe('ActionButton', () => {
  it('renders glycemie type with correct label', () => {
    const { getByText } = render(<ActionButton type="glycemie" />);
    expect(getByText('Glycémie')).toBeTruthy();
  });

  it('renders repas type with correct label', () => {
    const { getByText } = render(<ActionButton type="repas" />);
    expect(getByText('Repas')).toBeTruthy();
  });

  it('renders medic type with correct label', () => {
    const { getByText } = render(<ActionButton type="medic" />);
    expect(getByText('Médic')).toBeTruthy();
  });

  it('renders medicament type same as medic', () => {
    const { getByText } = render(<ActionButton type="medicament" />);
    expect(getByText('Médic')).toBeTruthy();
  });

  it('renders action type with correct label', () => {
    const { getByText } = render(<ActionButton type="action" />);
    expect(getByText('Action')).toBeTruthy();
  });

  it('renders unknown type with default label', () => {
    const { getByText } = render(<ActionButton type="unknown" />);
    expect(getByText('Action')).toBeTruthy();
  });

  it('uses custom label when provided', () => {
    const { getByText } = render(<ActionButton type="glycemie" label="Mon label" />);
    expect(getByText('Mon label')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ActionButton type="glycemie" onPress={onPress} />);
    fireEvent.press(getByText('Glycémie'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without onPress without crashing', () => {
    expect(() => render(<ActionButton type="glycemie" />)).not.toThrow();
  });

  it('is case-insensitive for type matching', () => {
    const { getByText } = render(<ActionButton type="GLYCEMIE" />);
    expect(getByText('Glycémie')).toBeTruthy();
  });

  it('renders prediction type with correct label', () => {
    const { getByText } = render(<ActionButton type="prediction" />);
    expect(getByText('Prédiction')).toBeTruthy();
  });

  it('renders lucide icon for type (Gauge for glycémie)', () => {
    const { getByTestId, getByText } = render(<ActionButton type="glycemie" />);
    expect(getByTestId('Gauge')).toBeTruthy();
    expect(getByText('Glycémie')).toBeTruthy();
  });

  it('prediction type with custom label overrides default', () => {
    const { getByText } = render(<ActionButton type="prediction" label="IA" />);
    expect(getByText('IA')).toBeTruthy();
  });
});
