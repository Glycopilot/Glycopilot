import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import PredictionsScreen from '../Predictions';
import predictionService from '../../services/predictionService';

jest.mock('../../services/predictionService', () => ({
  __esModule: true,
  default: { getLatest: jest.fn() },
}));
jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return function MockLayout({ children }: any) {
    return <View>{children}</View>;
  };
});

const mockNavigation = { navigate: jest.fn() };

const mockPrediction = {
  id: '1',
  for_time: '2026-01-01T09:00:00Z',
  created_at: '2026-01-01T08:45:00Z',
  model_version: 'v1.0',
  source: 'ensemble' as const,
  status: 'ok' as const,
  confidence: 0.92,
  input_readings_count: 12,
  y_hat_15: 118, p10_15: 105, p90_15: 130, risk_hypo_15: 0.05, risk_hyper_15: 0.1,
  y_hat_30: 125, p10_30: 110, p90_30: 140, risk_hypo_30: 0.04, risk_hyper_30: 0.15,
  y_hat_60: 130, p10_60: 112, p90_60: 148, risk_hypo_60: 0.03, risk_hyper_60: 0.2,
  recommendation: 'Glycémie stable, continuez votre activité.',
};

describe('Predictions Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('affiche le spinner de chargement initial', () => {
    (predictionService.getLatest as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);
    expect(getByText('Chargement des prédictions...')).toBeTruthy();
  });

  it('appelle getLatest au montage', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(null);
    render(<PredictionsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(predictionService.getLatest).toHaveBeenCalledTimes(1);
    });
  });

  it('affiche l\'état vide quand aucune prédiction n\'est disponible', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(null);
    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Aucune prédiction disponible')).toBeTruthy();
    });
  });

  it('affiche le titre Prédictions IA après chargement', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(null);
    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Prédictions IA')).toBeTruthy();
    });
  });

  it('affiche les 3 horizons quand la prédiction est disponible', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(mockPrediction);
    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Dans 15 min')).toBeTruthy();
      expect(getByText('Dans 30 min')).toBeTruthy();
      expect(getByText('Dans 60 min')).toBeTruthy();
    });
  });

  it('affiche le statut Fiable pour une prédiction ok', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(mockPrediction);
    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Fiable')).toBeTruthy();
    });
  });

  it('affiche le statut Données insuffisantes', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue({
      ...mockPrediction,
      status: 'insufficient_data' as const,
    });
    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Données insuffisantes')).toBeTruthy();
    });
  });

  it('affiche la recommandation quand elle est présente', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(mockPrediction);
    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Glycémie stable, continuez votre activité.')).toBeTruthy();
    });
  });

  it('n\'affiche pas la section recommandation quand elle est absente', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue({
      ...mockPrediction,
      recommendation: null,
    });
    const { queryByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(queryByText('💡 Recommandation')).toBeNull();
    });
  });

  it('affiche le nombre de lectures utilisées', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(mockPrediction);
    const { getByText } = render(<PredictionsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('12 lectures utilisées')).toBeTruthy();
    });
  });

  it('rafraîchit les prédictions depuis le bouton d\'en-tête', async () => {
    (predictionService.getLatest as jest.Mock).mockResolvedValue(mockPrediction);
    const { getByTestId } = render(<PredictionsScreen navigation={mockNavigation as any} />);

    await waitFor(() => expect(predictionService.getLatest).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('RefreshCw').parent as any);

    await waitFor(() => expect(predictionService.getLatest).toHaveBeenCalledTimes(2));
  });
});
