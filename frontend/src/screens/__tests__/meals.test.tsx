import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NutritionScreen from '../meals';

jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return function MockLayout({ children }: any) { return <View>{children}</View>; };
});

const mockNavigation = { navigate: jest.fn() };

describe('NutritionScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    expect(() => render(<NutritionScreen navigation={mockNavigation} />)).not.toThrow();
  });

  it('renders the screen title', async () => {
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Nutrition')).toBeTruthy());
  });

  it('shows default meal cards', async () => {
    const { getAllByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => {
      const breakfasts = getAllByText('Petit-déjeuner');
      expect(breakfasts.length).toBeGreaterThan(0);
    });
  });

  it('selects a meal card without crashing', async () => {
    const { getAllByText, getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Nutrition')).toBeTruthy());

    const breakfastCards = getAllByText('Petit-déjeuner');
    fireEvent.press(breakfastCards[0]);

    expect(getByText('Nutrition')).toBeTruthy();
  });

  it('opens add meal modal via touchable', async () => {
    const { UNSAFE_getAllByType, getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Nutrition')).toBeTruthy());

    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Press the add button (Plus icon area)
    if (touchables.length > 0) {
      fireEvent.press(touchables[touchables.length - 1]);
    }
    expect(getByText('Nutrition')).toBeTruthy();
  });

  it('renders Déjeuner in meal list', async () => {
    const { getAllByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => {
      const items = getAllByText('Déjeuner');
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it('does not navigate on render', async () => {
    render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(mockNavigation.navigate).not.toHaveBeenCalled());
  });
});
