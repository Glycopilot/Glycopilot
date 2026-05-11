import React from 'react';
import { render } from '@testing-library/react-native';
import JournalScreen from '../Journal';

const mockNavigation = {
  navigate: jest.fn(),
};

describe('JournalScreen', () => {
  it('renders the title', () => {
    const { getByText } = render(
      <JournalScreen navigation={mockNavigation as any} />,
    );

    expect(getByText('Journal')).toBeTruthy();
  });
});

