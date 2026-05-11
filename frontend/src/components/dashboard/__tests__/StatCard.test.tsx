import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import StatCard from '../StatCard';
import { Activity } from 'lucide-react-native';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Activity: () => null,
}));

describe('StatCard', () => {
  const defaultProps = {
    title: 'Activité',
    icon: Activity,
    iconColor: '#4C9AFF',
    iconBgColor: '#E5F2FF',
    value: 5000,
    subtitle: 'pas ce jour',
  };

  it('renders title correctly', () => {
    const { getByText } = render(<StatCard {...defaultProps} />);
    expect(getByText('Activité')).toBeTruthy();
  });

  it('renders subtitle correctly', () => {
    const { getByText } = render(<StatCard {...defaultProps} />);
    expect(getByText('pas ce jour')).toBeTruthy();
  });

  it('renders value correctly', () => {
    const { getByText } = render(<StatCard {...defaultProps} />);
    expect(getByText('5,000')).toBeTruthy();
  });

  it('renders secondary value when provided', () => {
    const { getByText } = render(
      <StatCard {...defaultProps} secondaryValue="/ 10000" />,
    );
    expect(getByText('/ 10000')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <StatCard {...defaultProps} onPress={onPress} />,
    );
    const { TouchableOpacity } = require('react-native');
    fireEvent.press(UNSAFE_getByType(TouchableOpacity));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders without onPress (no crash)', () => {
    const { getByText } = render(<StatCard {...defaultProps} />);
    expect(getByText('Activité')).toBeTruthy();
  });

  it('handles value of 0', () => {
    const { getByText } = render(<StatCard {...defaultProps} value={0} />);
    expect(getByText('0')).toBeTruthy();
  });
});
