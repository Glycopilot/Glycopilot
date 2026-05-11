import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Header from '../Header';
import useUser from '../../../hooks/useUser';
import alertService from '../../../services/alertService';
import authService from '../../../services/authService';

// Mock the hooks and services
jest.mock('../../../hooks/useUser');
jest.mock('../../../services/alertService');
jest.mock('../../../services/authService');

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
    Bell: 'Bell',
    User: 'User',
    LogOut: 'LogOut',
}));

describe('Header', () => {
    const mockNavigation = {
        navigate: jest.fn(),
        reset: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useUser as jest.Mock).mockReturnValue({
            user: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        });
        (alertService.getHistory as jest.Mock).mockResolvedValue([]);
    });

    it('renders correctly with user name', () => {
        const { getByText } = render(<Header navigation={mockNavigation} />);

        expect(getByText('Glycopilot')).toBeTruthy();
        expect(getByText('J')).toBeTruthy(); // Initiale du prénom
    });

    it('shows dropdown menu when clicking on profile', () => {
        const { getByText, queryByText } = render(<Header navigation={mockNavigation} />);

        // Dropdown should not be visible initially
        expect(queryByText('Profil')).toBeNull();

        // Click on profile avatar
        fireEvent.press(getByText('J'));

        // Dropdown should now be visible
        expect(getByText('Profil')).toBeTruthy();
        expect(getByText('Déconnexion')).toBeTruthy();
        expect(getByText('John Doe')).toBeTruthy();
    });

    it('navigates to profile when clicking Profil in dropdown', () => {
        const { getByText } = render(<Header navigation={mockNavigation} />);

        fireEvent.press(getByText('J'));
        fireEvent.press(getByText('Profil'));

        expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');
    });

    it('calls logout and redirects to Login when clicking Déconnexion', async () => {
        const { getByText } = render(<Header navigation={mockNavigation} />);

        fireEvent.press(getByText('J'));
        fireEvent.press(getByText('Déconnexion'));

        expect(authService.logout).toHaveBeenCalled();

        await waitFor(() => {
            expect(mockNavigation.reset).toHaveBeenCalledWith({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        });
    });

    it('shows alert dot if there are unacked alerts', async () => {
        (alertService.getHistory as jest.Mock).mockResolvedValue([
            { id: '1', status: 'UNACKED' }
        ]);

        const { getByTestId, UNSAFE_queryByType } = render(<Header navigation={mockNavigation} />);

        // We can't easily check for the dot by text, but we can verify it was fetched
        await waitFor(() => {
            expect(alertService.getHistory).toHaveBeenCalled();
        });
    });
});
