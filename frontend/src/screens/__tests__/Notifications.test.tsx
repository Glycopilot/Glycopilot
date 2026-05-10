import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NotificationsScreen from '../Notifications';
import alertService from '../../services/alertService';
import medicationService from '../../services/medicationService';

jest.mock('../../services/alertService');
jest.mock('../../services/medicationService');
jest.mock('../../services/toastService', () => ({
  toastSuccess: jest.fn(),
  toastError: jest.fn(),
}));
jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return function MockLayout({ children }: any) { return <View>{children}</View>; };
});

const mockNavigation = { navigate: jest.fn() };

const mockAlerts = [
  {
    id: '1',
    rule_name: 'Hypoglycemia Alert',
    status: 'TRIGGERED',
    triggered_at: new Date(Date.now() - 5 * 60000).toISOString(),
    value_at_trigger: 55,
  },
  {
    id: '2',
    rule_name: 'Hyperglycemia Alert',
    status: 'ACKED',
    triggered_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    value_at_trigger: 280,
  },
];

const todayISO = new Date().toISOString().slice(0, 10);
const pastTime = '07:00:00';
const futureTime = '23:59:00';

const mockTodayIntakes = [
  {
    id: 10,
    user_medication: 1,
    scheduled_date: todayISO,
    scheduled_time: pastTime,
    status: 'pending',
    medication_name: 'Doliprane',
  },
];

const mockHistory = [
  {
    id: 11,
    user_medication: 2,
    scheduled_date: todayISO,
    scheduled_time: '08:00:00',
    status: 'taken',
    medication_name: 'Metformine',
  },
];

const renderScreen = () => render(<NotificationsScreen navigation={mockNavigation} />);

const renderAndWaitForAlerts = async () => {
  const queries = renderScreen();
  await waitFor(() => expect(queries.getByText('Hypoglycemia Alert')).toBeTruthy());
  return queries;
};

const switchToMedications = async (queries: ReturnType<typeof render>) => {
  await waitFor(() => expect(queries.getByText('Rappels méd.')).toBeTruthy());
  fireEvent.press(queries.getByText('Rappels méd.'));
  await waitFor(() => expect(queries.getByText('Tous')).toBeTruthy());
};

describe('NotificationsScreen — Alertes glycémie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (alertService.getHistory as jest.Mock).mockResolvedValue(mockAlerts);
    (alertService.ackAlert as jest.Mock).mockResolvedValue(true);
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue(mockHistory);
    (medicationService.getToday as jest.Mock).mockResolvedValue(mockTodayIntakes);
  });

  it('renders the screen title', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Notifications')).toBeTruthy());
  });

  it('calls alertService.getHistory on mount', () => {
    renderScreen();
    expect(alertService.getHistory).toHaveBeenCalled();
  });

  it('renders alerts after loading', async () => {
    const { getByText } = await renderAndWaitForAlerts();
    expect(getByText('Hyperglycemia Alert')).toBeTruthy();
  });

  it('shows empty state when no alerts', async () => {
    (alertService.getHistory as jest.Mock).mockResolvedValue([]);
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Aucune alerte')).toBeTruthy());
  });

  it('filters hypo alerts when Hypo tab pressed', async () => {
    const { getByText } = await renderAndWaitForAlerts();
    fireEvent.press(getByText('Hypo'));
    await waitFor(() => expect(getByText('Hypoglycemia Alert')).toBeTruthy());
  });

  it('filters hyper alerts when Hyper tab pressed', async () => {
    const { getByText } = await renderAndWaitForAlerts();
    fireEvent.press(getByText('Hyper'));
    await waitFor(() => expect(getByText('Hyperglycemia Alert')).toBeTruthy());
  });

  it('shows all alerts after switching back to Toutes tab', async () => {
    const { getByText } = await renderAndWaitForAlerts();
    fireEvent.press(getByText('Hyper'));
    fireEvent.press(getByText('Toutes'));
    await waitFor(() => {
      expect(getByText('Hypoglycemia Alert')).toBeTruthy();
      expect(getByText('Hyperglycemia Alert')).toBeTruthy();
    });
  });
});

describe('NotificationsScreen — Rappels médicaments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (alertService.getHistory as jest.Mock).mockResolvedValue([]);
    (alertService.ackAlert as jest.Mock).mockResolvedValue(true);
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue(mockHistory);
    (medicationService.getToday as jest.Mock).mockResolvedValue(mockTodayIntakes);
  });

  it('calls getToday and getIntakeHistory when switching to médicaments', async () => {
    const queries = renderScreen();
    await waitFor(() => expect(queries.getByText('Notifications')).toBeTruthy());
    fireEvent.press(queries.getByText('Rappels méd.'));
    await waitFor(() => {
      expect(medicationService.getIntakeHistory).toHaveBeenCalled();
      expect(medicationService.getToday).toHaveBeenCalled();
    });
  });

  it('shows Tous filter by default', async () => {
    const queries = renderScreen();
    await switchToMedications(queries);
    expect(queries.getByText('Tous')).toBeTruthy();
  });

  it('shows En retard filter option', async () => {
    const queries = renderScreen();
    await switchToMedications(queries);
    // "En retard" apparaît dans le chip filtre ET dans le badge de la prise en retard
    expect(queries.getAllByText('En retard').length).toBeGreaterThanOrEqual(1);
  });

  it('shows taken intake as Pris', async () => {
    const queries = renderScreen();
    await switchToMedications(queries);
    await waitFor(() => expect(queries.getAllByText('Pris').length).toBeGreaterThanOrEqual(1));
  });

  it('shows empty message when no overdue and filter is En retard', async () => {
    (medicationService.getToday as jest.Mock).mockResolvedValue([
      {
        id: 20,
        user_medication: 3,
        scheduled_date: todayISO,
        scheduled_time: futureTime,
        status: 'pending',
        medication_name: 'Aspirine',
      },
    ]);
    const queries = renderScreen();
    await switchToMedications(queries);
    fireEvent.press(queries.getByText('En retard'));
    await waitFor(() => expect(queries.getByText('Aucune prise en retard')).toBeTruthy());
  });

  it('shows empty message when filter yields no results', async () => {
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue([]);
    (medicationService.getToday as jest.Mock).mockResolvedValue([]);
    const queries = renderScreen();
    await switchToMedications(queries);
    await waitFor(() => expect(queries.getByText('Aucun rappel')).toBeTruthy());
  });
});
