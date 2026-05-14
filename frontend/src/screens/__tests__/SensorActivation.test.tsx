import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SensorActivationScreen from '../SensorActivation';
import { useLibre2Sensor } from '../../hooks/useLibre2Sensor';

jest.mock('../../hooks/useLibre2Sensor');
jest.mock('libre2-cgm', () => ({
  __esModule: true,
  default: {
    addGlucoseReadingListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    addListeningStateListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    startListening: jest.fn().mockResolvedValue(true),
    stopListening: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockNavigation = { navigate: jest.fn() };

const defaultSensor = {
  status: 'IDLE' as const,
  current: null,
  error: null,
  start: jest.fn().mockResolvedValue(true),
  stop: jest.fn().mockResolvedValue(undefined),
};

describe('SensorActivation Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLibre2Sensor as jest.Mock).mockReturnValue(defaultSensor);
  });

  it('affiche le titre Surveillance temps réel', () => {
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(getByText('Surveillance temps réel')).toBeTruthy();
  });

  it('affiche le bouton Activer quand status est IDLE', () => {
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(getByText('Activer la surveillance')).toBeTruthy();
  });

  it('affiche le bouton Activer quand status est NO_JUGGLUCO', () => {
    (useLibre2Sensor as jest.Mock).mockReturnValue({ ...defaultSensor, status: 'NO_JUGGLUCO' as const });
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(getByText('Activer la surveillance')).toBeTruthy();
  });

  it('affiche le bouton Activer quand status est ERROR', () => {
    (useLibre2Sensor as jest.Mock).mockReturnValue({ ...defaultSensor, status: 'ERROR' as const });
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(getByText('Activer la surveillance')).toBeTruthy();
  });

  it('affiche le bouton Arrêter quand status est STREAMING', () => {
    (useLibre2Sensor as jest.Mock).mockReturnValue({ ...defaultSensor, status: 'STREAMING' as const });
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(getByText('Arrêter la surveillance')).toBeTruthy();
  });

  it('affiche le bouton Arrêter quand status est WAITING', () => {
    (useLibre2Sensor as jest.Mock).mockReturnValue({ ...defaultSensor, status: 'WAITING' as const });
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(getByText('Arrêter la surveillance')).toBeTruthy();
  });

  it('affiche le message d\'erreur quand sensor.error est défini', () => {
    (useLibre2Sensor as jest.Mock).mockReturnValue({ ...defaultSensor, error: 'Permission refusée' });
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(getByText('Permission refusée')).toBeTruthy();
  });

  it('n\'affiche pas la boîte d\'erreur sans erreur', () => {
    const { queryByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(queryByText('Permission refusée')).toBeNull();
  });

  it('affiche la valeur glycémique en direct quand sensor.current est défini', () => {
    (useLibre2Sensor as jest.Mock).mockReturnValue({
      ...defaultSensor,
      status: 'STREAMING' as const,
      current: {
        mgdl: 105,
        measuredAt: new Date('2026-01-01T10:00:00'),
        rate: 0.1,
        serial: 'ABC123',
      },
    });
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(getByText('105 mg/dL')).toBeTruthy();
  });

  it('appelle sensor.stop() au clic sur Arrêter', async () => {
    const mockStop = jest.fn().mockResolvedValue(undefined);
    (useLibre2Sensor as jest.Mock).mockReturnValue({ ...defaultSensor, status: 'STREAMING' as const, stop: mockStop });
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    fireEvent.press(getByText('Arrêter la surveillance'));
    await waitFor(() => expect(mockStop).toHaveBeenCalled());
  });

  it('affiche la section aide Première fois', () => {
    const { getByText } = render(<SensorActivationScreen navigation={mockNavigation as any} />);
    expect(getByText('Première fois ?')).toBeTruthy();
  });
});
