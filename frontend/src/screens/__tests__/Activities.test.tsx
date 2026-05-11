import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ActivityScreen from '../Activities';

// Mock navigation
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
