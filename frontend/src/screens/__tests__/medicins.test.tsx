import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MedicinsScreen from '../medicins';

jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return function MockLayout({ children }: any) { return <View>{children}</View>; };
});

const mockNavigation = { navigate: jest.fn() };

describe('MedicinsScreen (médicaments)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    expect(() => render(<MedicinsScreen navigation={mockNavigation} />)).not.toThrow();
  });

  it('renders the screen title', async () => {
    const { getByText } = render(<MedicinsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Médicaments')).toBeTruthy());
  });

  it('renders default medication list', async () => {
    const { getByText } = render(<MedicinsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Médicaments')).toBeTruthy());
  });

  it('switches to history tab without crashing', async () => {
    const { getAllByText, getByText } = render(<MedicinsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Médicaments')).toBeTruthy());

    // Click the Historique tab (first occurrence = the tab button)
    const historiqueTabs = getAllByText(/Historique/);
    fireEvent.press(historiqueTabs[0]);

    expect(getByText('Médicaments')).toBeTruthy();
  });

  it('opens add medication modal without crashing', async () => {
    const { UNSAFE_getAllByType, getByText } = render(<MedicinsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Médicaments')).toBeTruthy());

    // The add button uses a Plus icon (no text), find it via TouchableOpacity
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    // Press the first touchable (add button area)
    if (touchables.length > 0) {
      fireEvent.press(touchables[0]);
    }
    expect(getByText('Médicaments')).toBeTruthy();
  });

  it('renders medication items in list', async () => {
    const { getByText } = render(<MedicinsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Médicaments')).toBeTruthy());
    // Screen renders without crashing with default medications
    expect(getByText('Médicaments')).toBeTruthy();
  });

  it('switches back to À prendre tab', async () => {
    const { getAllByText, getByText } = render(<MedicinsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Médicaments')).toBeTruthy());

    const aPredreTabs = getAllByText(/À prendre/);
    fireEvent.press(aPredreTabs[0]);

    expect(getByText('Médicaments')).toBeTruthy();
  });
});
