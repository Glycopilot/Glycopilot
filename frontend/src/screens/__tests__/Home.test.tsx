import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import Home from '../Home';
import useDashboard from '../../hooks/useDashboard';

// Mock hooks
jest.mock('../../hooks/useDashboard');
jest.mock('../../hooks/useGlycemiaWebSocket', () => ({
    useGlycemiaWebSocket: jest.fn().mockReturnValue({ lastReading: null, alert: null }),
}));

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
};

describe('Home Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (useDashboard as jest.Mock).mockReturnValue({
            glucose: { value: 120, trend: 'stable', recordedAt: new Date().toISOString() },
            medication: { taken_count: 2, total_count: 3 },
            activity: { steps: { value: 5000, goal: 10000 } },
            healthScore: 80,
            refreshing: false,
            refresh: jest.fn(),
        });
    });

    it('renders correctly', async () => {
        const { getByText } = render(<Home navigation={mockNavigation as any} />);

        await waitFor(() => {
            expect(getByText('Dashboard')).toBeTruthy();
        });
    });
});
