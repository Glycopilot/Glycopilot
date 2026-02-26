import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Stats from '../Stats';
import { useDashboard } from '../../hooks/useDashboard';
import { useGlycemia } from '../../hooks/useGlycemia';
import useUser from '../../hooks/useUser';

// Mock hooks
jest.mock('../../hooks/useDashboard');
jest.mock('../../hooks/useGlycemia');
jest.mock('../../hooks/useUser');

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
    reset: jest.fn(),
};

// Mock components that might be problematic
jest.mock('react-native-chart-kit', () => ({
    LineChart: () => null,
    BarChart: () => null,
    PieChart: () => null,
}));

describe('Stats Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useUser as jest.Mock).mockReturnValue({
            user: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        });
        (useDashboard as jest.Mock).mockReturnValue({
            summary: { healthScore: 85, glucose: { average: 110, timeInRange: 80 } },
            loading: false,
            refresh: jest.fn(),
        });
        (useGlycemia as jest.Mock).mockReturnValue({
            measurements: [],
            loading: false,
            refreshing: false,
            refresh: jest.fn(),
            loadHistory: jest.fn(),
        });
    });

    it('renders correctly', async () => {
        const { getByText } = render(<Stats navigation={mockNavigation as any} />);

        await waitFor(() => {
            expect(getByText('Suivi Glucose')).toBeTruthy();
        });
    });
});
