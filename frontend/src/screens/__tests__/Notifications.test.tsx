import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NotificationsScreen from '../Notifications';
import alertService from '../../services/alertService';

jest.mock('../../services/alertService');
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

const renderScreen = () => render(<NotificationsScreen navigation={mockNavigation} />);

const renderAndWaitForAlerts = async () => {
  const queries = renderScreen();
  await waitFor(() => expect(queries.getByText('Hypoglycemia Alert')).toBeTruthy());
  return queries;
};

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (alertService.getHistory as jest.Mock).mockResolvedValue(mockAlerts);
    (alertService.ackAlert as jest.Mock).mockResolvedValue(true);
  });

  it('renders the screen title', async () => {
    const { getByText } = renderScreen();
    await waitFor(() => expect(getByText('Alertes')).toBeTruthy());
  });

  it('calls getHistory on mount', () => {
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
