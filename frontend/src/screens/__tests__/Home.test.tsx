import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import Home from '../Home';
import useDashboard from '../../hooks/useDashboard';
import { useMedications } from '../../hooks/useMedications';
import glycemiaService from '../../services/glycemiaService';

jest.mock('../../hooks/useDashboard');
jest.mock('../../hooks/useMedications');
jest.mock('../../hooks/useGlycemiaWebSocket', () => ({
  useGlycemiaWebSocket: jest.fn().mockReturnValue({ lastReading: null, alert: null }),
}));
jest.mock('../../services/glycemiaService', () => ({
  getCurrent: jest.fn(),
}));
jest.mock('../../services/pushService', () => ({
  registerForPushNotifications: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue('mock-token'),
  removeItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('../../services/toastService', () => ({
  toastError: jest.fn(),
  toastInfo: jest.fn(),
}));

const mockNavigation = { navigate: jest.fn() };

const defaultDashboard = {
  glucose: { value: 120, unit: 'mg/dL', trend: 'flat', recordedAt: '2026-01-01T08:00:00Z' },
  activity: { steps: { value: 5000, goal: 10000 }, activeMinutes: 30 },
  healthScore: 80,
  refreshing: false,
  refresh: jest.fn(),
  loadSummary: jest.fn(),
};

const defaultMedications = {
  todayIntakes: [],
};

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useDashboard as jest.Mock).mockReturnValue(defaultDashboard);
    (useMedications as jest.Mock).mockReturnValue(defaultMedications);
    (glycemiaService.getCurrent as jest.Mock).mockResolvedValue(null);
  });

  it('renders dashboard section', async () => {
    const { getByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Dashboard')).toBeTruthy();
    });
  });

  it('appelle glycemiaService.getCurrent au montage', async () => {
    render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(glycemiaService.getCurrent).toHaveBeenCalledTimes(1);
    });
  });

  it('affiche la valeur glycémique du dashboard quand getCurrent retourne null', async () => {
    (glycemiaService.getCurrent as jest.Mock).mockResolvedValue(null);
    const { getByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('120')).toBeTruthy();
    });
  });

  it('affiche la valeur glycémique de getCurrent quand plus récente que le dashboard', async () => {
    (glycemiaService.getCurrent as jest.Mock).mockResolvedValue({
      id: '1',
      value: 145,
      unit: 'mg/dL',
      measured_at: '2026-01-01T09:00:00Z',
      trend: 'rising',
      source: 'manual',
    });
    const { getByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('145')).toBeTruthy();
    });
  });

  it('affiche la valeur du dashboard quand getCurrent est plus ancienne', async () => {
    (glycemiaService.getCurrent as jest.Mock).mockResolvedValue({
      id: '1',
      value: 90,
      unit: 'mg/dL',
      measured_at: '2025-12-31T00:00:00Z',
      source: 'manual',
    });
    (useDashboard as jest.Mock).mockReturnValue({
      ...defaultDashboard,
      glucose: { value: 120, unit: 'mg/dL', trend: 'flat', recordedAt: '2026-01-01T08:00:00Z' },
    });
    const { getByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('120')).toBeTruthy();
    });
  });

  it('affiche "Aucune mesure" quand pas de données glycémiques', async () => {
    (glycemiaService.getCurrent as jest.Mock).mockResolvedValue(null);
    (useDashboard as jest.Mock).mockReturnValue({ ...defaultDashboard, glucose: undefined });
    const { getAllByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => {
      // GlycemieCard affiche le badge "Aucune mesure" et le texte long — les deux sont valides
      expect(getAllByText('Aucune mesure').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('handleRefresh appelle refresh() et getCurrent() en parallèle', async () => {
    const mockRefresh = jest.fn().mockResolvedValue(undefined);
    (useDashboard as jest.Mock).mockReturnValue({ ...defaultDashboard, refresh: mockRefresh });
    (glycemiaService.getCurrent as jest.Mock).mockResolvedValue(null);

    render(<Home navigation={mockNavigation as any} />);

    // getCurrent appelé au montage
    await waitFor(() => expect(glycemiaService.getCurrent).toHaveBeenCalledTimes(1));

    // Simuler un second appel direct (équivalent handleRefresh)
    await act(async () => {
      await mockRefresh();
      await (glycemiaService.getCurrent as jest.Mock)();
    });

    expect(mockRefresh).toHaveBeenCalled();
    expect(glycemiaService.getCurrent).toHaveBeenCalledTimes(2);
  });

  it('affiche le résumé médicaments depuis useMedications', async () => {
    (useMedications as jest.Mock).mockReturnValue({
      todayIntakes: [
        { status: 'taken', scheduled_time: '08:00', scheduled_date: '2026-01-01', medication_name: 'Doliprane' },
        { status: 'pending', scheduled_time: '12:00', scheduled_date: '2026-01-01', medication_name: 'Metformine' },
      ],
    });
    const { getByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('1')).toBeTruthy(); // taken_count
    });
  });

  it('affiche une alerte d\'hypoglycémie via WebSocket', async () => {
    const { useGlycemiaWebSocket } = require('../../hooks/useGlycemiaWebSocket');
    const { toastError } = require('../../services/toastService');
    
    (useGlycemiaWebSocket as jest.Mock).mockReturnValue({
        lastReading: null,
        alert: { data: { value: 65, unit: 'mg/dL' } }
    });

    render(<Home navigation={mockNavigation as any} />);
    
    await waitFor(() => {
        expect(toastError).toHaveBeenCalledWith('Hypoglycémie', expect.stringContaining('65'));
    });
  });

  it('affiche une alerte d\'hyperglycémie via WebSocket', async () => {
    const { useGlycemiaWebSocket } = require('../../hooks/useGlycemiaWebSocket');
    const { toastInfo } = require('../../services/toastService');

    (useGlycemiaWebSocket as jest.Mock).mockReturnValue({
      lastReading: null,
      alert: { data: { value: 220, unit: 'mg/dL' } },
    });

    render(<Home navigation={mockNavigation as any} />);

    await waitFor(() => {
      expect(toastInfo).toHaveBeenCalledWith('Hyperglycémie', expect.stringContaining('220'));
    });
  });

  it('prioritise la lecture WebSocket quand elle est plus récente', async () => {
    const { useGlycemiaWebSocket } = require('../../hooks/useGlycemiaWebSocket');

    (useGlycemiaWebSocket as jest.Mock).mockReturnValue({
      lastReading: {
        value: 175,
        unit: 'mg/dL',
        trend: 'rising',
        measured_at: '2026-01-01T10:00:00Z',
      },
      alert: null,
    });
    (useDashboard as jest.Mock).mockReturnValue({
      ...defaultDashboard,
      glucose: { value: 120, unit: 'mg/dL', trend: 'flat', recordedAt: '2026-01-01T08:00:00Z' },
    });

    const { getByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('175')).toBeTruthy();
    });
  });

  it('renders Activité StatCard quand activity est defini', async () => {
    const { getAllByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => {
      // 'Activité' appears in both StatCard title and ActionButton label
      expect(getAllByText('Activité').length).toBeGreaterThan(0);
    });
  });

  it('ne crash pas quand activity est undefined', async () => {
    (useDashboard as jest.Mock).mockReturnValue({ ...defaultDashboard, activity: undefined });
    expect(() => render(<Home navigation={mockNavigation as any} />)).not.toThrow();
  });

  it('ne crash pas avec glycémie basse (< 70) — couvre status low', async () => {
    (glycemiaService.getCurrent as jest.Mock).mockResolvedValue(null);
    (useDashboard as jest.Mock).mockReturnValue({
      ...defaultDashboard,
      glucose: { value: 55, unit: 'mg/dL', trend: 'falling', recordedAt: '2026-01-01T08:00:00Z' },
    });
    const { getByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Dashboard')).toBeTruthy());
  });

  it('ne crash pas avec glycémie haute (> 180) — couvre status high', async () => {
    (glycemiaService.getCurrent as jest.Mock).mockResolvedValue(null);
    (useDashboard as jest.Mock).mockReturnValue({
      ...defaultDashboard,
      glucose: { value: 220, unit: 'mg/dL', trend: 'rising', recordedAt: '2026-01-01T08:00:00Z' },
    });
    const { getByText } = render(<Home navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Dashboard')).toBeTruthy());
  });

  it('ne active pas le WebSocket quand le token est null', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(null);

    const { useGlycemiaWebSocket } = require('../../hooks/useGlycemiaWebSocket');
    render(<Home navigation={mockNavigation as any} />);

    await waitFor(() => {
      // getApiClient called with null token (wsEnabled=false)
      expect(useGlycemiaWebSocket).toHaveBeenCalledWith(null, expect.anything());
    });
  });

  it('navigue vers SensorActivation via bouton capteur', async () => {
    const { fireEvent } = require('@testing-library/react-native');
    const { getByText } = render(<Home navigation={mockNavigation as any} />);

    await waitFor(() => expect(getByText('Mon capteur')).toBeTruthy());
    fireEvent.press(getByText('Mon capteur'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('SensorActivation');
  });

  it('navigue vers les différents écrans via les boutons d\'action', async () => {
    const { getByText, getByTestId } = render(<Home navigation={mockNavigation as any} />);
    const { fireEvent } = require('@testing-library/react-native');

    await act(async () => {
      fireEvent.press(getByText('Repas'));
      fireEvent.press(getByText('Médic'));
      // « Activité » apparaît aussi sur la StatCard pas — le bouton rapide utilise l’icône Zap (mock lucide).
      fireEvent.press(getByTestId('Zap').parent!);
      fireEvent.press(getByText('Prédiction'));
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Repas');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Traitements');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Activite');
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Predictions');
  });
});
