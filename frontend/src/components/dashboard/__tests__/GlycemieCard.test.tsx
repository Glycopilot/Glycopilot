import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import GlycemieCard from '../GlycemieCard';

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Gauge: () => null,
  MoveUpRight: () => null,
  MoveDownRight: () => null,
  Minus: () => null,
}));

describe('GlycemieCard', () => {
  it('renders value correctly', () => {
    const { getByText } = render(<GlycemieCard value={120} />);
    expect(getByText('120')).toBeTruthy();
  });

  it('renders unit mg/dL', () => {
    const { getByText } = render(<GlycemieCard value={120} />);
    expect(getByText('mg/dL')).toBeTruthy();
  });

  it('renders with rising trend', () => {
    const { toJSON } = render(
      <GlycemieCard value={150} trend="rising" />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with falling trend', () => {
    const { toJSON } = render(
      <GlycemieCard value={80} trend="falling" />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with flat trend', () => {
    const { toJSON } = render(
      <GlycemieCard value={100} trend="flat" />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('calculates low status for value below 70', () => {
    const { toJSON } = render(<GlycemieCard value={60} />);
    expect(toJSON()).toBeTruthy();
  });

  it('calculates high status for value above 180', () => {
    const { toJSON } = render(<GlycemieCard value={200} />);
    expect(toJSON()).toBeTruthy();
  });

  it('calculates normal status for value in range', () => {
    const { toJSON } = render(<GlycemieCard value={120} />);
    expect(toJSON()).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <GlycemieCard value={120} onPress={onPress} />,
    );
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders with explicit status override', () => {
    const { toJSON } = render(
      <GlycemieCard value={120} status="warning" />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders with timestamp', () => {
    const { toJSON } = render(
      <GlycemieCard value={120} timestamp="2024-01-01T12:00:00Z" />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
