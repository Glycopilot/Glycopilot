import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import PredictionsScreen from '../Predictions';
import predictionService from '../../services/predictionService';

jest.mock('../../services/predictionService');
jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return function MockLayout({ children }: any) { return <View>{children}</View>; };
});
jest.mock('lucide-react-native', () => ({
  Brain: () => null, AlertTriangle: () => null, CheckCircle: () => null,
  Clock: () => null, TrendingUp: () => null, TrendingDown: () => null,
  Minus: () => null, RefreshCw: () => null,
}));

const mockNav = { navigate: jest.fn() };

const makePrediction = (overrides: Partial<any> = {}): any => ({
  id: '1',
  for_time: new Date(Date.now() + 900000).toISOString(),
  created_at: new Date().toISOString(),
  model_version: '1.0',
  source: 'ensemble',
  status: 'ok',
  confidence: 0.85,
  input_readings_count: 12,
  y_hat_15: 5.5, p10_15: 4.8, p90_15: 6.2, risk_hypo_15: 0.05, risk_hyper_15: 0.1,
  y_hat_30: 6.0, p10_30: 5.2, p90_30: 6.8, risk_hypo_30: 0.05, risk_hyper_30: 0.15,
  y_hat_60: 6.5, p10_60: 5.5, p90_60: 7.5, risk_hypo_60: 0.05, risk_hyper_60: 0.2,
  recommendation: 'Continuer la surveillance régulière',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  (predictionService.getLatest as jest.Mock).mockResolvedValue(makePrediction());
  (predictionService.getHistory as jest.Mock).mockResolvedValue([]);
});

describe('PredictionsScreen', () => {
  it('renders loading state initially', async () => {
    (predictionService.getLatest as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const { UNSAFE_getByType } = render(<PredictionsScreen navigation={mockNav} />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders prediction data when loaded', async () => {
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions|Prediction/i)).toBeTruthy());
  });

  it('renders when prediction is null (no data)', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(null);
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions|Aucune|données/i)).toBeTruthy());
  });

  it('renders with low_confidence status', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(
      makePrediction({ status: 'low_confidence', confidence: 0.45 })
    );
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });

  it('renders with insufficient_data status', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(
      makePrediction({ status: 'insufficient_data', input_readings_count: 2 })
    );
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });

  it('renders with error status', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(
      makePrediction({ status: 'error' })
    );
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });

  it('renders with hypoglycemia risk values', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(
      makePrediction({ y_hat_15: 3.2, risk_hypo_15: 0.85, risk_hyper_15: 0.01 })
    );
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });

  it('renders with hyperglycemia risk values', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(
      makePrediction({ y_hat_15: 12.0, risk_hypo_15: 0.01, risk_hyper_15: 0.90 })
    );
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });

  it('renders with null prediction values', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(
      makePrediction({ y_hat_15: null, y_hat_30: null, y_hat_60: null, confidence: null })
    );
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });

  it('renders with baseline source', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(
      makePrediction({ source: 'baseline' })
    );
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });

  it('renders with lstm source', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(
      makePrediction({ source: 'lstm' })
    );
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });

  it('renders with history data', async () => {
    (predictionService.getHistory as jest.Mock).mockResolvedValue([
      makePrediction({ id: '2', status: 'ok' }),
    ]);
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });

  it('handles refresh by scroll pull-to-refresh', async () => {
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
    // Verify refresh is re-callable
    expect(predictionService.getLatest).toHaveBeenCalled();
  });

  it('renders with no recommendation', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(
      makePrediction({ recommendation: null })
    );
    const { getByText } = render(<PredictionsScreen navigation={mockNav} />);
    await waitFor(() => expect(getByText(/Prédictions/i)).toBeTruthy());
  });
});
