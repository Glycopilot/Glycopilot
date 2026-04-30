import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
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
  {
    id: '3',
    rule_name: 'Normal Alert',
    status: 'RESOLVED',
    triggered_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    value_at_trigger: 100,
  },
];

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (alertService.getHistory as jest.Mock).mockResolvedValue(mockAlerts);
    (alertService.ackAlert as jest.Mock).mockResolvedValue(true);
  });

  it('renders the screen title', async () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Alertes')).toBeTruthy());
  });

  it('shows loading state initially', () => {
    const { queryByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    // During loading, alert list not shown yet
    expect(alertService.getHistory).toHaveBeenCalled();
  });

  it('renders alerts after loading', async () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Hypoglycemia Alert')).toBeTruthy();
      expect(getByText('Hyperglycemia Alert')).toBeTruthy();
    });
  });

  it('shows empty state when no alerts', async () => {
    (alertService.getHistory as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Aucune alerte')).toBeTruthy();
    });
  });

  it('filters hypo alerts when hypo tab pressed', async () => {
    const { getByText, queryByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Hypoglycemia Alert')).toBeTruthy());

    fireEvent.press(getByText('Hypo'));

    await waitFor(() => {
      expect(getByText('Hypoglycemia Alert')).toBeTruthy();
    });
  });

  it('filters hyper alerts when hyper tab pressed', async () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Hyperglycemia Alert')).toBeTruthy());

    fireEvent.press(getByText('Hyper'));

    await waitFor(() => {
      expect(getByText('Hyperglycemia Alert')).toBeTruthy();
    });
  });

  it('shows all alerts when all tab pressed', async () => {
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Hypoglycemia Alert')).toBeTruthy());

    fireEvent.press(getByText('Hyper'));
    fireEvent.press(getByText('Toutes'));

    await waitFor(() => {
      expect(getByText('Hypoglycemia Alert')).toBeTruthy();
      expect(getByText('Hyperglycemia Alert')).toBeTruthy();
    });
  });

  it('renders correctly when service returns empty results', async () => {
    (alertService.getHistory as jest.Mock).mockResolvedValue([]);
    const { getByText } = render(<NotificationsScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Aucune alerte')).toBeTruthy());
  });
});
