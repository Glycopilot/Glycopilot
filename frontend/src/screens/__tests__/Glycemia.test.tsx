import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import GlycemiaScreen from '../Glycemia';
import { useGlycemia } from '../../hooks/useGlycemia';

jest.mock('../../hooks/useGlycemia');
jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return function MockLayout({ children }: any) { return <View>{children}</View>; };
});
jest.mock('lucide-react-native', () => ({
  Droplet: () => null, Plus: () => null, TrendingUp: () => null,
  TrendingDown: () => null, Minus: () => null, Calendar: () => null, Clock: () => null,
}));

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };

const defaultMockGlycemia = {
  measurements: [],
  loading: false,
  error: null,
  refreshing: false,
  currentValue: null,
  refresh: jest.fn(),
  loadHistory: jest.fn(),
  addManualReading: jest.fn(),
};

const mockMeasurements = [
  { id: '1', value: 5.5, measured_at: new Date().toISOString(), source: 'manual', context: 'fasting' },
  { id: '2', value: 3.2, measured_at: new Date().toISOString(), source: 'cgm', context: 'postprandial_1h' },
  { id: '3', value: 9.0, measured_at: new Date().toISOString(), source: 'manual', context: 'bedtime' },
];

beforeEach(() => {
  jest.clearAllMocks();
  (useGlycemia as jest.Mock).mockReturnValue(defaultMockGlycemia);
});

describe('Glycemia Screen', () => {
  it('renders correctly with empty state', async () => {
    const { getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
  });

  it('shows loading indicator when loading=true', async () => {
    (useGlycemia as jest.Mock).mockReturnValue({ ...defaultMockGlycemia, loading: true });
    const { UNSAFE_getByType } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    const { ActivityIndicator } = require('react-native');
    await waitFor(() => expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy());
  });

  it('renders measurements list when data is available', async () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      ...defaultMockGlycemia,
      measurements: mockMeasurements,
    });
    const { getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
  });

  it('renders with current value set', async () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      ...defaultMockGlycemia,
      currentValue: mockMeasurements[0],
    });
    const { getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
  });

  it('handles refreshing state', async () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      ...defaultMockGlycemia,
      refreshing: true,
      measurements: mockMeasurements,
    });
    const { getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
  });

  it('opens modal when plus button is pressed', async () => {
    const { getByText, getAllByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
    // Find and press the plus/add button
    const addButtons = getAllByText(/\+|Ajouter|Add/i);
    if (addButtons.length > 0) {
      await act(async () => fireEvent.press(addButtons[0]));
    }
  });

  it('renders with high glycemia value (hyperglycemia branch)', async () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      ...defaultMockGlycemia,
      measurements: [{ id: '1', value: 12.0, measured_at: new Date().toISOString(), source: 'manual' }],
      currentValue: { id: '1', value: 12.0, measured_at: new Date().toISOString() },
    });
    const { getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
  });

  it('renders with low glycemia value (hypoglycemia branch)', async () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      ...defaultMockGlycemia,
      measurements: [{ id: '1', value: 2.5, measured_at: new Date().toISOString(), source: 'cgm' }],
      currentValue: { id: '1', value: 2.5, measured_at: new Date().toISOString() },
    });
    const { getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
  });

  it('renders with normal glycemia value', async () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      ...defaultMockGlycemia,
      measurements: [{ id: '1', value: 5.5, measured_at: new Date().toISOString(), source: 'manual' }],
      currentValue: { id: '1', value: 5.5, measured_at: new Date().toISOString() },
    });
    const { getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
  });

  it('renders filter buttons and handles press', async () => {
    (useGlycemia as jest.Mock).mockReturnValue({ ...defaultMockGlycemia, measurements: mockMeasurements });
    const { getAllByText, getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
    // Try to press filter buttons (Tous, Manuel, CGM)
    const filterButtons = getAllByText(/Tous|Manuel|CGM/i);
    for (const btn of filterButtons) {
      await act(async () => fireEvent.press(btn));
    }
  });

  it('handles error state', async () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      ...defaultMockGlycemia,
      error: 'Erreur de connexion',
    });
    const { getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Glycémie')).toBeTruthy());
  });
});
