import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import GlycemiaScreen from '../Glycemia';
import { useGlycemia } from '../../hooks/useGlycemia';

// Mock hooks
jest.mock('../../hooks/useGlycemia');

// Mock navigation
const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
};

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
        const { getByText } = render(<GlycemiaScreen navigation={mockNavigation as any} />);

        await waitFor(() => {
            expect(getByText('Glycémie')).toBeTruthy();
        });
    });
});
