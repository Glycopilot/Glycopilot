import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import PredictionsScreen from '../Predictions';
import predictionService from '../../services/predictionService';

jest.mock('../../services/predictionService', () => ({
  __esModule: true,
  default: {
    getLatest: jest.fn(),
  },
}));

jest.mock('../../components/common/Layout', () => {
  return function MockLayout({ children }: any) {
    return <>{children}</>;
  };
});

const mockNavigation = { navigate: jest.fn() };

describe('PredictionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows empty state when no prediction is available', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(null);
    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);

    await waitFor(() => {
      expect(getByText('Aucune prédiction disponible')).toBeTruthy();
    });
  });

  it('renders prediction values when data exists', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue({
      id: 'pred-1',
      for_time: '2026-05-13T08:15:00Z',
      created_at: '2026-05-13T08:00:00Z',
      model_version: 'v1',
      source: 'ensemble',
      status: 'ok',
      confidence: 0.88,
      input_readings_count: 12,
      y_hat_15: 110,
      p10_15: 100,
      p90_15: 120,
      risk_hypo_15: 0.05,
      risk_hyper_15: 0.1,
      y_hat_30: 120,
      p10_30: 110,
      p90_30: 130,
      risk_hypo_30: 0.08,
      risk_hyper_30: 0.15,
      y_hat_60: 130,
      p10_60: 120,
      p90_60: 140,
      risk_hypo_60: 0.1,
      risk_hyper_60: 0.2,
      recommendation: 'Hydrate-toi et surveille dans 30 min',
    });

    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);

    await waitFor(() => {
      expect(getByText('Prédictions IA')).toBeTruthy();
      expect(getByText('Prévisions')).toBeTruthy();
      expect(getByText('Hydrate-toi et surveille dans 30 min')).toBeTruthy();
    });
  });
});
