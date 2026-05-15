import React from 'react';
import { render } from '@testing-library/react-native';
import JournalScreen from '../Journal';

const mockNavigation = { navigate: jest.fn() };

describe('Journal Screen', () => {
  it('rend le titre Journal', () => {
    const { getByText } = render(<JournalScreen navigation={mockNavigation as any} />);
    expect(getByText('Journal')).toBeTruthy();
  });

  it('se monte sans erreur', () => {
    expect(() =>
      render(<JournalScreen navigation={mockNavigation as any} />)
    ).not.toThrow();
  });
});
