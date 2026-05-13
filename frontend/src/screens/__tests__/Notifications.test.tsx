import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
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

describe('NotificationsScreen — helper functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (alertService.ackAlert as jest.Mock).mockResolvedValue(true);
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue([]);
    (medicationService.getToday as jest.Mock).mockResolvedValue([]);
  });

  it('renders À l\'instant for very recent alert (< 1 min)', async () => {
    (alertService.getHistory as jest.Mock).mockResolvedValue([{
      id: 'recent',
      rule_name: 'Hypo Instant',
      status: 'TRIGGERED',
      triggered_at: new Date(Date.now() - 30000).toISOString(), // 30s ago
      glycemia_value: 55,
    }]);
    const { findByText } = renderScreen();
    expect(await findByText("À l'instant")).toBeTruthy();
  });

  it('renders Il y a Xj for old alert (> 24h)', async () => {
    (alertService.getHistory as jest.Mock).mockResolvedValue([{
      id: 'old',
      rule_name: 'Hypo Ancien',
      status: 'TRIGGERED',
      triggered_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(), // 2 days ago
      glycemia_value: 60,
    }]);
    const { findByText } = renderScreen();
    expect(await findByText('Il y a 2j')).toBeTruthy();
  });

  it('renders badge Envoyée for SENT status', async () => {
    (alertService.getHistory as jest.Mock).mockResolvedValue([{
      id: 'sent-1',
      rule_name: 'Hypo Envoyée',
      status: 'SENT',
      triggered_at: new Date(Date.now() - 3600000).toISOString(),
      glycemia_value: 62,
    }]);
    const { findByText } = renderScreen();
    expect(await findByText('Envoyée')).toBeTruthy();
  });

  it('renders badge Résolue for RESOLVED status without ack button', async () => {
    (alertService.getHistory as jest.Mock).mockResolvedValue([{
      id: 'resolved-1',
      rule_name: 'Hyper Résolue',
      status: 'RESOLVED',
      triggered_at: new Date(Date.now() - 7200000).toISOString(),
      glycemia_value: 250,
    }]);
    const { findByText, queryByTestId } = renderScreen();
    expect(await findByText('Résolue')).toBeTruthy();
    await waitFor(() => {
      expect(queryByTestId('ack-button-resolved-1')).toBeNull();
    });
  });

  it('renders badge Échouée for FAILED status', async () => {
    (alertService.getHistory as jest.Mock).mockResolvedValue([{
      id: 'failed-1',
      rule_name: 'Hypo Échouée',
      status: 'FAILED',
      triggered_at: new Date(Date.now() - 1800000).toISOString(),
      glycemia_value: 58,
    }]);
    const { findByText } = renderScreen();
    expect(await findByText('Échouée')).toBeTruthy();
  });

  it('renders badge Acquittée for ACKED status without ack button', async () => {
    (alertService.getHistory as jest.Mock).mockResolvedValue([{
      id: 'acked-1',
      rule_name: 'Hypo Acked',
      status: 'ACKED',
      triggered_at: new Date(Date.now() - 3600000).toISOString(),
      glycemia_value: 65,
    }]);
    const { findByText, queryByTestId } = renderScreen();
    expect(await findByText('Acquittée')).toBeTruthy();
    await waitFor(() => {
      expect(queryByTestId('ack-button-acked-1')).toBeNull();
    });
  });
});

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

  it('appelle alertService.ackAlert quand on clique sur le bouton d\'acquittement', async () => {
    const { getByTestId } = await renderAndWaitForAlerts();
    const { toastSuccess } = require('../../services/toastService');
    
    const ackButton = getByTestId('ack-button-1');
    await act(async () => {
        fireEvent.press(ackButton);
    });
    
    expect(alertService.ackAlert).toHaveBeenCalledWith('1');
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Alerte acquittée'));
  });

  it('affiche le bouton "Voir plus" quand il y a plus de 10 alertes', async () => {
    const manyAlerts = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        rule_name: `Alert ${i + 1}`,
        status: 'TRIGGERED',
        triggered_at: new Date().toISOString(),
        glycemia_value: 120
    }));
    (alertService.getHistory as jest.Mock).mockResolvedValue(manyAlerts);
    
    const { getByText, queryByText } = renderScreen();
    await waitFor(() => expect(getByText('Alert 1')).toBeTruthy());
    
    expect(getByText(/Voir 5 de plus/)).toBeTruthy();
    fireEvent.press(getByText(/Voir 5 de plus/));
    expect(getByText('Alert 15')).toBeTruthy();
  });
});

describe('NotificationsScreen — handleAck failure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (alertService.getHistory as jest.Mock).mockResolvedValue([{
      id: 99,
      rule_name: 'Hypo Test',
      status: 'TRIGGERED',
      triggered_at: new Date(Date.now() - 60000).toISOString(),
      glycemia_value: 60,
    }]);
    (alertService.ackAlert as jest.Mock).mockResolvedValue(false);
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue([]);
    (medicationService.getToday as jest.Mock).mockResolvedValue([]);
  });

  it('affiche toastError quand ackAlert retourne false', async () => {
    const { getByTestId } = renderScreen();
    const { toastError } = require('../../services/toastService');

    await waitFor(() => expect(getByTestId('ack-button-99')).toBeTruthy());
    await act(async () => { fireEvent.press(getByTestId('ack-button-99')); });

    await waitFor(() => expect(toastError).toHaveBeenCalled());
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

  it('filters taken intakes when Pris is pressed', async () => {
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue([
      { ...mockHistory[0], status: 'taken' },
    ]);
    const queries = renderScreen();
    await switchToMedications(queries);
    await waitFor(() => expect(queries.getAllByText('Pris').length).toBeGreaterThan(0));
    fireEvent.press(queries.getAllByText('Pris')[0]);
  });

  it('filters missed intakes when Manqué is pressed', async () => {
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue([
      { id: 20, user_medication: 2, scheduled_date: todayISO, scheduled_time: '09:00:00', status: 'missed', medication_name: 'Aspirin' },
    ]);
    const queries = renderScreen();
    await switchToMedications(queries);
    await waitFor(() => expect(queries.getByText('Manqué')).toBeTruthy());
    fireEvent.press(queries.getByText('Manqué'));
    await waitFor(() => expect(queries.getByText('Aspirin')).toBeTruthy());
  });

  it('filters snoozed intakes when Reporté is pressed', async () => {
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue([
      { id: 21, user_medication: 2, scheduled_date: todayISO, scheduled_time: '10:00:00', status: 'snoozed', medication_name: 'Ibuprofène' },
    ]);
    const queries = renderScreen();
    await switchToMedications(queries);
    await waitFor(() => expect(queries.getByText('Reporté')).toBeTruthy());
    fireEvent.press(queries.getByText('Reporté'));
    await waitFor(() => expect(queries.getByText('Ibuprofène')).toBeTruthy());
  });

  it('shows medication dosage when set', async () => {
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue([
      { id: 22, user_medication: 2, scheduled_date: todayISO, scheduled_time: '08:00:00', status: 'taken', medication_name: 'Paracétamol', medication_dosage: '500mg' },
    ]);
    const queries = renderScreen();
    await switchToMedications(queries);
    await waitFor(() => expect(queries.getByText('500mg')).toBeTruthy());
  });
});
