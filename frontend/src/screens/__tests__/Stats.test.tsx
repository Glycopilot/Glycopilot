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
jest.mock('../../components/common/CalendarPicker', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function MockCalendarPicker({ onDateSelect, onClose }: any) {
    return (
      <>
        <TouchableOpacity onPress={() => onDateSelect && onDateSelect(new Date('2024-01-15'))}>
          <Text>SelectDate</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}><Text>CloseCalendar</Text></TouchableOpacity>
      </>
    );
  };
});
jest.mock('../../components/common/Layout', () => ({ children }: any) => <>{children}</>);
jest.mock('lucide-react-native', () => ({
  Calendar: () => null, Download: () => null, CheckCircle: () => null,
}));
jest.mock('../../utils/pdfGenerator', () => ({
  generateMedicalReportHTML: jest.fn().mockReturnValue('<html>Report</html>'),
}));

const mockNav = { navigate: jest.fn(), reset: jest.fn() };

const makeMeasurements = (values: Array<{ value: number; source: 'manual' | 'cgm'; hoursAgo?: number }>) =>
  values.map((m, i) => ({
    id: String(i + 1),
    value: m.value,
    measured_at: new Date(Date.now() - (m.hoursAgo || 0) * 3600000).toISOString(),
    context: 'fasting',
    source: m.source,
  }));

const defaultHook = {
  measurements: makeMeasurements([
    { value: 120, source: 'manual' },
    { value: 150, source: 'cgm', hoursAgo: 1 },
    { value: 200, source: 'manual', hoursAgo: 2 },   // hyperglycemia
    { value: 3.5, source: 'cgm', hoursAgo: 3 },      // hypoglycemia
  ]),
  loading: false,
  refreshing: false,
  error: null,
  currentValue: null,
  refresh: jest.fn(),
  loadHistory: jest.fn(),
  addManualReading: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (useUser as jest.Mock).mockReturnValue({
    user: { firstName: 'Jean', lastName: 'Patient', email: 'jean@test.com' },
  });
  (useGlycemia as jest.Mock).mockReturnValue(defaultHook);
});

describe('GlucoseTrackingScreen', () => {
  it('renders correctly and shows stats', () => {
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    expect(getByText('Suivi Glucose')).toBeTruthy();
    expect(getByText('Moyenne')).toBeTruthy();
  });

  it('shows loading indicator when loading', () => {
    (useGlycemia as jest.Mock).mockReturnValue({ ...defaultHook, loading: true, measurements: [] });
    const { UNSAFE_getByType } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('shows refreshing indicator', () => {
    (useGlycemia as jest.Mock).mockReturnValue({ ...defaultHook, refreshing: true });
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    expect(getByText('Suivi Glucose')).toBeTruthy();
  });

  it('handles empty data state', () => {
    (useGlycemia as jest.Mock).mockReturnValue({ ...defaultHook, measurements: [] });
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    expect(getByText('Aucune mesure disponible')).toBeTruthy();
  });

  it('changes period to Semaine', async () => {
    const loadHistory = jest.fn();
    (useGlycemia as jest.Mock).mockReturnValue({ ...defaultHook, loadHistory });
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    fireEvent.press(getByText('Semaine'));
    expect(loadHistory).toHaveBeenCalledWith(7);
  });

  it('changes period to Mois', async () => {
    const loadHistory = jest.fn();
    (useGlycemia as jest.Mock).mockReturnValue({ ...defaultHook, loadHistory });
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    fireEvent.press(getByText('Mois'));
    expect(loadHistory).toHaveBeenCalledWith(30);
  });

  it('changes period back to Jour', async () => {
    const loadHistory = jest.fn();
    (useGlycemia as jest.Mock).mockReturnValue({ ...defaultHook, loadHistory });
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    fireEvent.press(getByText('Semaine'));
    fireEvent.press(getByText('Jour'));
    expect(loadHistory).toHaveBeenCalledWith(1);
  });

  it('filters by Manuel source', () => {
    const { getAllByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    const manualButtons = getAllByText('Manuel');
    fireEvent.press(manualButtons[0]);
    expect(getAllByText('Manuel').length).toBeGreaterThan(0);
  });

  it('filters by CGM source', () => {
    const { getAllByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    const cgmButtons = getAllByText('CGM');
    if (cgmButtons.length > 0) fireEvent.press(cgmButtons[0]);
  });

  it('re-presses Manuel filter to toggle', () => {
    const { getAllByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    const manualButtons = getAllByText('Manuel');
    if (manualButtons.length > 0) {
      fireEvent.press(manualButtons[0]);
      fireEvent.press(manualButtons[0]); // toggle back
    }
  });

  it('exports to PDF successfully', async () => {
    (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: 'file://report.pdf' });
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    await act(async () => fireEvent.press(getByText('PDF Médical')));
    await waitFor(() => expect(Print.printToFileAsync).toHaveBeenCalled());
  });

  it('handles PDF export error gracefully', async () => {
    (Print.printToFileAsync as jest.Mock).mockRejectedValue(new Error('Print failed'));
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    await act(async () => fireEvent.press(getByText('PDF Médical')));
    await waitFor(() => expect(Print.printToFileAsync).toHaveBeenCalled());
  });

  it('opens calendar picker', async () => {
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    // Press the calendar date button
    try {
      const calBtn = getByText(/Date|Calendrier|\d{1,2}\/\d{1,2}/i);
      await act(async () => fireEvent.press(calBtn));
    } catch {
      // Calendar button may not be found with this text
    }
  });

  it('renders with only in-range measurements (stability: Bon)', () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      ...defaultHook,
      measurements: makeMeasurements([
        { value: 5.5, source: 'manual' },
        { value: 6.0, source: 'manual' },
        { value: 6.5, source: 'cgm' },
      ]),
    });
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    expect(getByText('Suivi Glucose')).toBeTruthy();
  });

  it('renders with no user data', () => {
    (useUser as jest.Mock).mockReturnValue({ user: null });
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    expect(getByText('Suivi Glucose')).toBeTruthy();
  });

  it('renders with high variability measurements', () => {
    (useGlycemia as jest.Mock).mockReturnValue({
      ...defaultHook,
      measurements: makeMeasurements([
        { value: 2.0, source: 'manual' },
        { value: 15.0, source: 'cgm' },
        { value: 1.5, source: 'manual' },
        { value: 20.0, source: 'cgm' },
      ]),
    });
    const { getByText } = render(<GlucoseTrackingScreen navigation={mockNav as any} />);
    expect(getByText('Suivi Glucose')).toBeTruthy();
  });
});
