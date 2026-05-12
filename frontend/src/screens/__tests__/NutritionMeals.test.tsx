import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Journal from '../Journal';

jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return function MockLayout({ children }: any) { return <View>{children}</View>; };
});

const mockNavigation = { navigate: jest.fn() };

describe('Journal screen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    expect(() =>
      render(<Journal navigation={mockNavigation} />)
    ).not.toThrow();
  });

  it('renders main content', async () => {
    const { getByText } = render(<Journal navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Journal') || getByText('Glycopilot')).toBeTruthy();
    });
  });
});
