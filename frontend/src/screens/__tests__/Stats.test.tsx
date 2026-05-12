import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import GlucoseTrackingScreen from '../Stats';
import { useGlycemia } from '../../hooks/useGlycemia';
import useUser from '../../hooks/useUser';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Mocks
jest.mock('../../hooks/useGlycemia');
jest.mock('../../hooks/useUser');
jest.mock('expo-print');
jest.mock('expo-sharing');
jest.mock('../../components/glycemia/GlycemiaChart', () => 'GlycemiaChart');
jest.mock('../../components/common/CalendarPicker', () => 'CalendarPicker');
jest.mock('../../components/common/Layout', () => ({ children }: any) => <>{children}</>);
jest.mock('lucide-react-native', () => ({
  Calendar: () => null,
  Download: () => null,
  CheckCircle: () => null,
}));

const mockMeasurements = [
  {
    id: '1',
    value: 120,
    measured_at: new Date().toISOString(),
    context: 'fasting',
    source: 'manual',
  },
  {
    id: '2',
    value: 150,
    measured_at: new Date(Date.now() - 3600000).toISOString(), // 1h ago
    context: 'postprandial_1h',
    source: 'cgm',
  }
];

describe('GlucoseTrackingScreen', () => {
  beforeEach(() => {
    (useUser as jest.Mock).mockReturnValue({
      user: { firstName: 'Jean', lastName: 'Patient', email: 'jean@test.com' }
    });
    (useGlycemia as jest.Mock).mockReturnValue({
      measurements: mockMeasurements,
      loading: false,
      refreshing: false,
      refresh: jest.fn(),
      loadHistory: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and shows stats', () => {
    const { getByText, getAllByText } = render(<GlucoseTrackingScreen navigation={{ navigate: jest.fn() } as any} />);

    expect(getByText('Suivi Glucose')).toBeTruthy();
    expect(getByText('Moyenne')).toBeTruthy();
    expect(getByText('135')).toBeTruthy(); // (120 + 150) / 2
    expect(getAllByText('120').length).toBeGreaterThan(0); // min
    expect(getAllByText('150').length).toBeGreaterThan(0); // max
  });

  it('changes period filter', async () => {
    const loadHistory = jest.fn();
    (useGlycemia as jest.Mock).mockReturnValue({
      measurements: mockMeasurements,
      loading: false,
      refreshing: false,
      refresh: jest.fn(),
      loadHistory,
    });

    const { getByText } = render(<GlucoseTrackingScreen navigation={{ navigate: jest.fn() } as any} />);

    const weekButton = getByText('Semaine');
    fireEvent.press(weekButton);

    expect(loadHistory).toHaveBeenCalledWith(7);
  });

  it('filters by source', () => {
    const { getByText, queryByText, getAllByText } = render(<GlucoseTrackingScreen navigation={{ navigate: jest.fn() } as any} />);

    const manualButton = getAllByText('Manuel')[0];
    fireEvent.press(manualButton);

    // Should only show manual measurement (120)
    expect(getAllByText('120').length).toBeGreaterThan(0);
    expect(queryByText('135')).toBeNull(); // Average should be 120 now
  });

  it('exports to PDF', async () => {
    (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: 'file://report.pdf' });
    
    const { getByText } = render(<GlucoseTrackingScreen navigation={{ navigate: jest.fn() } as any} />);

    const exportButton = getByText('PDF Médical');
    fireEvent.press(exportButton);

    await waitFor(() => {
      expect(Print.printToFileAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).toHaveBeenCalledWith('file://report.pdf', expect.anything());
    });
  });

  it('handles empty data state', () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      measurements: [],
      loading: false,
      refreshing: false,
      refresh: jest.fn(),
      loadHistory: jest.fn(),
    });

    const { getByText } = render(<GlucoseTrackingScreen navigation={{ navigate: jest.fn() } as any} />);
    expect(getByText('Aucune mesure disponible')).toBeTruthy();
  });

  it('change la période à Mois', async () => {
    const loadHistory = jest.fn();
    (useGlycemia as jest.Mock).mockReturnValue({
      measurements: mockMeasurements,
      loading: false,
      refreshing: false,
      refresh: jest.fn(),
      loadHistory,
    });
    const { getByText } = render(<GlucoseTrackingScreen navigation={{ navigate: jest.fn() } as any} />);
    fireEvent.press(getByText('Mois'));
    expect(loadHistory).toHaveBeenCalledWith(30);
  });

  it('filtre par source CGM', () => {
    const { getAllByText, getByText } = render(<GlucoseTrackingScreen navigation={{ navigate: jest.fn() } as any} />);
    const cgmButton = getAllByText(/CGM/i)[0];
    fireEvent.press(cgmButton);
    expect(getAllByText('150').length).toBeGreaterThan(0);
  });

  it('appelle refresh lors du pull to refresh', () => {
    const refresh = jest.fn();
    (useGlycemia as jest.Mock).mockReturnValue({
      measurements: mockMeasurements,
      loading: false,
      refreshing: false,
      refresh,
      loadHistory: jest.fn(),
    });
    const { UNSAFE_getByType } = render(<GlucoseTrackingScreen navigation={{ navigate: jest.fn() } as any} />);
    const { RefreshControl } = require('react-native');
    const refreshControl = UNSAFE_getByType(RefreshControl);
    refreshControl.props.onRefresh();
    expect(refresh).toHaveBeenCalled();
  });

  it('affiche une alerte en cas d\'erreur de génération PDF', async () => {
    const { Alert } = require('react-native');
    const spyAlert = jest.spyOn(Alert, 'alert');
    (Print.printToFileAsync as jest.Mock).mockRejectedValue(new Error('PDF Error'));
    
    const { getByText } = render(<GlucoseTrackingScreen navigation={{ navigate: jest.fn() } as any} />);
    fireEvent.press(getByText('PDF Médical'));

    await waitFor(() => {
        expect(spyAlert).toHaveBeenCalledWith('Erreur', expect.any(String), expect.any(Array));
    });
  });
});
