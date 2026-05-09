import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from '../Profile';
import useUser from '../../hooks/useUser';
import { useAuth } from '../../hooks/useAuth';
import authService from '../../services/authService';
import doctorService from '../../services/doctorService';

jest.mock('../../hooks/useUser');
jest.mock('../../hooks/useAuth');
jest.mock('../../services/authService');
jest.mock('../../services/doctorService');
jest.mock('../../components/profile/LocationModal', () => {
    return function MockLocationModal() { return null; };
});
jest.mock('../../components/profile/LocationTracker', () => {
    return function MockLocationTracker() { return null; };
});

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockRefetch = jest.fn();

const mockTeamEmpty = {
    doctors: [],
    pending_doctor_invites: [],
    family: [],
};

const mockTeamWithDoctor = {
    doctors: [{
        id_team_member: 'tm-1',
        member_details: {
            first_name: 'Jean',
            last_name: 'Dupont',
            specialty: 'Endocrinologie',
            phone_number: '+33612345678',
            email: 'jean@hopital.fr',
            medical_center_address: 'Lyon',
        },
        role: 'REFERENT_DOCTOR',
        status: 'ACTIVE',
    }],
    pending_doctor_invites: [],
    family: [],
};

const renderProfile = () =>
    render(
        <ProfileScreen navigation={{ navigate: mockNavigate, reset: mockReset }} />,
    );

describe('ProfileScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

        (useUser as jest.Mock).mockReturnValue({
            user: {
                firstName: 'Test',
                lastName: 'User',
                phoneNumber: '+33 6 00 00 00 00',
                address: 'Paris',
                diabetesType: 'type1',
            },
            loading: false,
            refetch: mockRefetch,
        });

        (useAuth as jest.Mock).mockReturnValue({
            logout: jest.fn().mockResolvedValue(undefined),
        });

        (doctorService.getMyTeam as jest.Mock).mockResolvedValue(mockTeamEmpty);
        (doctorService.inviteDoctor as jest.Mock).mockResolvedValue(undefined);
        (doctorService.acceptInvitation as jest.Mock).mockResolvedValue(undefined);
        (doctorService.removeTeamMember as jest.Mock).mockResolvedValue(undefined);
        (doctorService.addFamilyMember as jest.Mock).mockResolvedValue({ id: 'new-id' });
        (authService.updateProfile as jest.Mock).mockResolvedValue(undefined);
    });

    it('renders profile content when user is loaded', async () => {
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Glycopilot')).toBeTruthy());
    });

    it('shows loading spinner when userLoading is true', () => {
        (useUser as jest.Mock).mockReturnValue({ user: null, loading: true, refetch: jest.fn() });
        const { UNSAFE_getAllByType } = renderProfile();
        const { ActivityIndicator } = require('react-native');
        expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    });

    it('calls doctorService.getMyTeam on mount', async () => {
        renderProfile();
        await waitFor(() => expect(doctorService.getMyTeam).toHaveBeenCalled());
    });

    it('renders doctor when team has an active referent', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue(mockTeamWithDoctor);
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Dr. Jean Dupont')).toBeTruthy());
    });

    it('renders received pending invite with accept button', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue({
            ...mockTeamEmpty,
            pending_doctor_invites: [{
                id_team_member: 'inv-1',
                member_details: { first_name: 'Marie', last_name: 'Curie', specialty: null },
                approved_by: 'someone',
            }],
        });
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Accepter')).toBeTruthy());
    });

    it('renders sent pending invite with cancel button', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue({
            ...mockTeamEmpty,
            pending_doctor_invites: [{
                id_team_member: 'inv-2',
                member_details: { first_name: 'Paul', last_name: 'Martin', specialty: null },
                approved_by: null,
            }],
        });
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Annuler')).toBeTruthy());
    });

    it('handles acceptInvite success', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue({
            ...mockTeamEmpty,
            pending_doctor_invites: [{
                id_team_member: 'inv-1',
                member_details: { first_name: 'Marie', last_name: 'Curie', specialty: null },
                approved_by: 'someone',
            }],
        });
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Accepter')).toBeTruthy());

        await act(async () => { fireEvent.press(getByText('Accepter')); });

        await waitFor(() => {
            expect(doctorService.acceptInvitation).toHaveBeenCalledWith('inv-1');
        });
    });

    it('handles acceptInvite error', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue({
            ...mockTeamEmpty,
            pending_doctor_invites: [{
                id_team_member: 'inv-1',
                member_details: { first_name: 'Marie', last_name: 'Curie', specialty: null },
                approved_by: 'someone',
            }],
        });
        (doctorService.acceptInvitation as jest.Mock).mockRejectedValue(new Error('Erreur réseau'));

        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Accepter')).toBeTruthy());

        await act(async () => { fireEvent.press(getByText('Accepter')); });

        await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    });

    it('handles cancelInvite success', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue({
            ...mockTeamEmpty,
            pending_doctor_invites: [{
                id_team_member: 'inv-2',
                member_details: { first_name: 'Paul', last_name: 'Martin', specialty: null },
                approved_by: null,
            }],
        });
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Annuler')).toBeTruthy());

        await act(async () => { fireEvent.press(getByText('Annuler')); });

        await waitFor(() => {
            expect(doctorService.removeTeamMember).toHaveBeenCalledWith('inv-2');
        });
    });

    it('handles fetchDoctor error gracefully', async () => {
        (doctorService.getMyTeam as jest.Mock).mockRejectedValue(new Error('Network error'));
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Glycopilot')).toBeTruthy());
    });

    it('renders family contacts from team', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue({
            ...mockTeamEmpty,
            family: [{
                id_team_member: 'f-1',
                member_details: { first_name: 'Sophie', last_name: 'Dupont', phone_number: '+33611223344' },
                relation_type: 'sister',
            }],
        });
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Sophie Dupont')).toBeTruthy());
    });

    it('handles logout confirmation alert', async () => {
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Déconnexion')).toBeTruthy());
        fireEvent.press(getByText('Déconnexion'));
        expect(Alert.alert).toHaveBeenCalledWith(
            'Déconnexion',
            'Êtes-vous sûr de vouloir vous déconnecter ?',
            expect.any(Array),
        );
    });

    it('opens edit profile modal', async () => {
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Modifier le profil')).toBeTruthy());
        fireEvent.press(getByText('Modifier le profil'));
    });

    it('shows remove doctor alert when remove pressed', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue(mockTeamWithDoctor);
        const { getByTestId } = renderProfile();
        await waitFor(() => expect(getByTestId('X')).toBeTruthy());
        fireEvent.press(getByTestId('X'));
        expect(Alert.alert).toHaveBeenCalledWith(
            'Retirer le médecin',
            expect.any(String),
            expect.any(Array),
        );
    });
});
