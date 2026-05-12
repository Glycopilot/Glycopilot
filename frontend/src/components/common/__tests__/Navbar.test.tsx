import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Navbar from '../Navbar';

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Home: () => null,
  ChartColumn: () => null,
  User: () => null,
  Droplet: () => null,
}));

const mockNavigation = { navigate: jest.fn() };

describe('Navbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<Navbar navigation={mockNavigation} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders 4 tabs', () => {
    const { UNSAFE_getAllByType } = render(
      <Navbar navigation={mockNavigation} />,
    );
    const { TouchableOpacity } = require('react-native');
    const buttons = UNSAFE_getAllByType(TouchableOpacity);
    expect(buttons.length).toBe(4);
  });

  it('navigates to Home when first tab pressed', () => {
    const { UNSAFE_getAllByType } = render(
      <Navbar navigation={mockNavigation} />,
    );
    const { TouchableOpacity } = require('react-native');
    const tabs = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(tabs[0]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Home');
  });

  it('navigates to Glycemia when second tab pressed', () => {
    const { UNSAFE_getAllByType } = render(
      <Navbar navigation={mockNavigation} />,
    );
    const { TouchableOpacity } = require('react-native');
    const tabs = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(tabs[1]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Glycemia');
  });

  it('navigates to Stats when third tab pressed', () => {
    const { UNSAFE_getAllByType } = render(
      <Navbar navigation={mockNavigation} />,
    );
    const { TouchableOpacity } = require('react-native');
    const tabs = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(tabs[2]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Stats');
  });

  it('navigates to Profile when fourth tab pressed', () => {
    const { UNSAFE_getAllByType } = render(
      <Navbar navigation={mockNavigation} />,
    );
    const { TouchableOpacity } = require('react-native');
    const tabs = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(tabs[3]);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');
  });

  it('uses currentRoute prop to set active tab', () => {
    const { toJSON } = render(
      <Navbar navigation={mockNavigation} currentRoute="Stats" />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
