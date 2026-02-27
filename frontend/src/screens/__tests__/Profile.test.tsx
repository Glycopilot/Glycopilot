import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../Profile';
import useUser from '../../hooks/useUser';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';

jest.mock('../../hooks/useUser');
jest.mock('../../hooks/useAuth');
jest.mock('../../services/authService');
jest.mock('../../components/profile/LocationModal', () => {
    return function MockLocationModal() {
        return null;
    };
});
jest.mock('../../components/profile/LocationTracker', () => {
    return function MockLocationTracker() {
        return null;
    };
});

const mockNavigate = jest.fn();
const mockReset = jest.fn();

const renderProfile = () =>
    render(
        <ProfileScreen
            navigation={{
                navigate: mockNavigate,
                reset: mockReset,
            }}
        />,
    );

describe('ProfileScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        (useUser as jest.Mock).mockReturnValue({
            user: {
                firstName: 'Test',
                lastName: 'User',
                phoneNumber: '+33 6 00 00 00 00',
                address: 'Paris',
                diabetesType: 'type1',
            },
            loading: false,
            refetch: jest.fn(),
        });

        (useAuth as jest.Mock).mockReturnValue({
            logout: jest.fn().mockResolvedValue(undefined),
        });
    });

    it('renders profile content when user is loaded', () => {
        const { getByText } = renderProfile();

        // On vérifie simplement que l'écran et le layout se montent
        expect(getByText('Glycopilot')).toBeTruthy();
    });

    // Interaction tests (ouverture de modales, sauvegarde de profil) sont
    // déjà couvertes indirectement via les tests unitaires de composants
    // (`AddContactModal`, `EditProfileModal`) et de services (`authService`).
});

