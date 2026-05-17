import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import GlycemiaScreen from '../Glycemia';
import { useGlycemia } from '../../hooks/useGlycemia';

jest.mock('../../hooks/useGlycemia');
jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return function MockLayout({ children }: any) {
    return <View>{children}</View>;
  };
});

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const todayIso = new Date().toISOString();

const baseMeasurements = [
  {
    id: 1,
    reading_id: 'manual-1',
    measured_at: todayIso,
    value: 118,
    context: 'fasting',
    source: 'manual',
    notes: 'Avant petit déjeuner',
  },
  {
    id: 2,
    reading_id: 'cgm-1',
    measured_at: '2026-05-16T13:20:00Z',
    value: 205,
    context: 'postprandial_1h',
    source: 'cgm',
    notes: 'Capteur Libre',
  },
  {
    id: 3,
    reading_id: 'manual-2',
    measured_at: '2026-05-15T22:10:00Z',
    value: 62,
    context: 'bedtime',
    source: 'manual',
    notes: '',
  },
];

function mockGlycemia(overrides: Partial<ReturnType<typeof useGlycemia>> = {}) {
  const value = {
    measurements: baseMeasurements,
    loading: false,
    refreshing: false,
    refresh: jest.fn(),
    addManualReading: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  (useGlycemia as jest.Mock).mockReturnValue(value);
  return value;
}

describe('Glycemia Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGlycemia();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders loading and empty states', () => {
    mockGlycemia({ loading: true, measurements: [] });
    const loading = render(
      <GlycemiaScreen navigation={mockNavigation as any} />
    );
    expect(loading.getByText('Chargement...')).toBeTruthy();
    loading.unmount();

    mockGlycemia({ loading: false, measurements: [] });
    const empty = render(<GlycemiaScreen navigation={mockNavigation as any} />);
    expect(empty.getByText('Aucune mesure enregistrée')).toBeTruthy();
    expect(
      empty.getByText('Appuyez sur + pour ajouter votre première mesure')
    ).toBeTruthy();
  });

  it('renders stats, measurement statuses, contexts and sources', () => {
    const { getByText, getAllByText } = render(
      <GlycemiaScreen navigation={mockNavigation as any} />
    );

    expect(getByText('Glycémie')).toBeTruthy();
    expect(getByText('Suivi de votre taux de glucose')).toBeTruthy();
    expect(getByText(/Aujourd'hui/)).toBeTruthy();
    expect(getByText('Avant petit déjeuner')).toBeTruthy();
    expect(getByText('Capteur Libre')).toBeTruthy();
    expect(getByText('À jeun')).toBeTruthy();
    expect(getByText('Après repas (1h)')).toBeTruthy();
    expect(getByText('Coucher')).toBeTruthy();
    expect(getByText('Normal')).toBeTruthy();
    expect(getByText('Hyper')).toBeTruthy();
    expect(getByText('Hypo')).toBeTruthy();
    expect(getAllByText('Manuel').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('CGM').length).toBeGreaterThanOrEqual(1);
  });

  it('filters by manual and CGM sources', () => {
    const { getByText, getAllByText, queryByText } = render(
      <GlycemiaScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getAllByText('Manuel')[0]);
    expect(getByText('Avant petit déjeuner')).toBeTruthy();
    expect(queryByText('Capteur Libre')).toBeNull();

    fireEvent.press(getByText('CGM'));
    expect(getByText('Capteur Libre')).toBeTruthy();
    expect(queryByText('Avant petit déjeuner')).toBeNull();

    fireEvent.press(getByText('Toutes'));
    expect(getByText('Avant petit déjeuner')).toBeTruthy();
    expect(getByText('Capteur Libre')).toBeTruthy();
  });

  it('paginates long measurement lists', () => {
    const manyMeasurements = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      reading_id: `reading-${index + 1}`,
      measured_at: `2026-05-${String(10 + index).padStart(2, '0')}T08:00:00Z`,
      value: 100 + index,
      context: 'fasting',
      source: 'manual',
      notes: `note-${index + 1}`,
    }));
    mockGlycemia({ measurements: manyMeasurements });

    const { getByText, queryByText } = render(
      <GlycemiaScreen navigation={mockNavigation as any} />
    );

    expect(getByText('note-10')).toBeTruthy();
    expect(queryByText('note-11')).toBeNull();

    fireEvent.press(getByText('Voir 2 de plus (2 restantes)'));

    expect(getByText('note-11')).toBeTruthy();
    expect(getByText('note-12')).toBeTruthy();
  });

  it('adds a valid manual reading and resets the form', async () => {
    const addManualReading = jest.fn().mockResolvedValue(true);
    mockGlycemia({ addManualReading });
    const {
      getByText,
      getByPlaceholderText,
      getAllByTestId,
      queryByDisplayValue,
    } = render(<GlycemiaScreen navigation={mockNavigation as any} />);

    fireEvent.press(getAllByTestId('Plus')[0].parent as any);
    fireEvent.changeText(getByPlaceholderText('120'), '145');
    fireEvent.press(getByText('Après repas (2h)'));
    fireEvent.changeText(
      getByPlaceholderText('Ex: Avant sport, stress, malaise...'),
      'Après déjeuner'
    );
    fireEvent.press(getByText('Enregistrer'));

    await waitFor(() =>
      expect(addManualReading).toHaveBeenCalledWith({
        value: 145,
        context: 'postprandial_2h',
        notes: 'Après déjeuner',
      })
    );
    expect(queryByDisplayValue('145')).toBeNull();
  });

  it('handles invalid values, failed saves and thrown errors', async () => {
    const addManualReading = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('network'));
    mockGlycemia({ addManualReading });
    const { getByText, getByPlaceholderText, getAllByTestId } = render(
      <GlycemiaScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getAllByTestId('Plus')[0].parent as any);
    fireEvent.changeText(getByPlaceholderText('120'), '601');
    fireEvent.press(getByText('Enregistrer'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Valeur invalide',
      'La valeur doit être entre 20 et 600 mg/dL'
    );

    fireEvent.changeText(getByPlaceholderText('120'), '140');
    fireEvent.press(getByText('Enregistrer'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erreur',
        "Impossible d'enregistrer la mesure."
      )
    );

    fireEvent.press(getByText('Enregistrer'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erreur',
        "Une erreur est survenue lors de l'enregistrement."
      )
    );
  });
});
