import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ActivityScreen from '../Activities';
import activityService from '../../services/activityService';

jest.mock('../../services/activityService', () => ({
  getReferenceActivities: jest.fn(),
  getUserActivities: jest.fn(),
  logActivity: jest.fn(),
  deleteActivity: jest.fn(),
}));

jest.mock('../../hooks/usePedometer', () => ({
  usePedometer: () => ({
    todaySteps: 3500,
    available: true,
    stepGoal: 8000,
    isTracking: false,
    sessionSteps: 0,
    setStepGoal: jest.fn(),
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
  }),
}));

jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return ({ children }: any) => <View>{children}</View>;
});

const mockNavigation = { navigate: jest.fn(), reset: jest.fn() };

const referenceActivity = {
  activity_id: 1,
  name: 'Course à pied',
  recommended_duration: 30,
  calories_burned: 600,
  sugar_used: 5.0,
  link_photo: null,
};

const userActivity = {
  id: 1,
  activity: 1,
  activity_details: referenceActivity,
  start: new Date().toISOString(),
  end: new Date().toISOString(),
  duration_minutes: 30,
  intensity: 'Modérée',
  steps: 3200,
  total_calories_burned: 300,
  total_sugar_used: 2.5,
};

describe('Activities Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (activityService.getReferenceActivities as jest.Mock).mockResolvedValue([referenceActivity]);
    (activityService.getUserActivities as jest.Mock).mockResolvedValue([]);
  });

  it('affiche le titre et le résumé hebdomadaire', async () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Activité')).toBeTruthy();
      expect(getByText('Cette semaine')).toBeTruthy();
    });
  });

  it('affiche les pas du jour depuis le podomètre', async () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('3 500')).toBeTruthy();
    });
  });

  it('affiche le message vide si aucune activité', async () => {
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Aucune activité enregistrée')).toBeTruthy();
    });
  });

  it('affiche une activité enregistrée', async () => {
    (activityService.getUserActivities as jest.Mock).mockResolvedValue([userActivity]);
    const { getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Course à pied')).toBeTruthy();
      expect(getByText('300 kcal')).toBeTruthy();
    });
  });

  it('ouvre le modal en cliquant sur le bouton +', async () => {
    const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByTestId('add-activity-btn')).toBeTruthy());

    fireEvent.press(getByTestId('add-activity-btn'));

    await waitFor(() => {
      expect(getByText('Ajouter une activité')).toBeTruthy();
    });
  });

  it('affiche les activités du référentiel dans le modal', async () => {
    const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByTestId('add-activity-btn')).toBeTruthy());

    fireEvent.press(getByTestId('add-activity-btn'));

    await waitFor(() => {
      expect(getByText('Course à pied')).toBeTruthy();
    });
  });

  it('appelle logActivity à la soumission', async () => {
    (activityService.logActivity as jest.Mock).mockResolvedValue(userActivity);
    const { getByTestId, getByText } = render(<ActivityScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByTestId('add-activity-btn')).toBeTruthy());

    fireEvent.press(getByTestId('add-activity-btn'));
    await waitFor(() => expect(getByText('Course à pied')).toBeTruthy());

    fireEvent.press(getByText('Course à pied'));
    fireEvent.press(getByText('Ajouter'));

    await waitFor(() => {
      expect(activityService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({ activity: 1, duration_minutes: 30 })
      );
    });
  });
});
