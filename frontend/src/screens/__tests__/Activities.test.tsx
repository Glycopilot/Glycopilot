import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

jest.mock('../../services/readStepsForToday', () => ({
  readStepsForToday: jest.fn().mockResolvedValue(null),
}));

jest.mock('../../services/stepsSyncService', () => ({
  fetchDailyStepsState: jest.fn().mockResolvedValue({
    day: '2026-05-10',
    reported_steps_today: 0,
    total_milestone_points: 0,
    step_block: 100,
    points_per_block: 5,
  }),
  syncDailySteps: jest.fn(),
}));

jest.mock('../../services/activitiesApiService', () => ({
  fetchActivityTypes: jest.fn().mockResolvedValue([]),
  fetchUserActivityHistory: jest.fn().mockResolvedValue([]),
  createUserActivity: jest.fn(),
}));

jest.mock('../../services/toastService', () => ({
  toastSuccess: jest.fn(),
  toastError: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useFocusEffect: (cb: () => void | (() => void)) => {
      React.useEffect(() => {
        return cb() ?? undefined;
      }, []);
    },
  };
});

import ActivityScreen from '../Activities';

const mockNavigation = {
  navigate: jest.fn(),
};

describe('Activities Screen', () => {
    it('renders correctly', async () => {
        const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);

        await waitFor(() => {
            expect(getByText('Activité')).toBeTruthy();
            expect(getByText('Cette semaine')).toBeTruthy();
        });
    });
});
