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
        (useGlycemia as jest.Mock).mockReturnValue({
            measurements: [],
            loading: false,
            refreshing: false,
            refresh: jest.fn(),
            addManualReading: jest.fn(),
        });
    });

    it('renders correctly', async () => {
        const { getAllByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);

        await waitFor(() => {
            expect(getAllByText('Glycémie').length).toBeGreaterThan(0);
        });
    });
});
