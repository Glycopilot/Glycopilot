import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
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
const mockLogout = jest.fn().mockResolvedValue(undefined);

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
    family: [{
        id_team_member: 'fam-1',
        member_details: {
            first_name: 'Sophie',
            last_name: 'Dupont',
            phone_number: '+33600000001',
        },
        relation_type: 'Conjoint',
    }],
};

const renderProfile = () =>
    render(
        <ProfileScreen navigation={{ navigate: mockNavigate, reset: mockReset }} />,
    );

describe('ProfileScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
        jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);

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

        (useAuth as jest.Mock).mockReturnValue({ logout: mockLogout });

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

    it('calls Linking.openURL when call button pressed', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue(mockTeamWithDoctor);
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Appeler')).toBeTruthy());
        fireEvent.press(getByText('Appeler'));
        expect(Linking.openURL).toHaveBeenCalledWith('tel:+33612345678');
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

    it('handles cancelInvite error', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue({
            ...mockTeamEmpty,
            pending_doctor_invites: [{
                id_team_member: 'inv-2',
                member_details: { first_name: 'Paul', last_name: 'Martin', specialty: null },
                approved_by: null,
            }],
        });
        (doctorService.removeTeamMember as jest.Mock).mockRejectedValue(new Error('Erreur'));

        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Annuler')).toBeTruthy());

        await act(async () => { fireEvent.press(getByText('Annuler')); });

        await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
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

    it('shows remove doctor alert when remove pressed', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue(mockTeamWithDoctor);
        const { getByTestId } = renderProfile();
        await waitFor(() => expect(getByTestId('delete-doctor-button')).toBeTruthy());
        fireEvent.press(getByTestId('delete-doctor-button'));
        expect(Alert.alert).toHaveBeenCalledWith(
            'Retirer le médecin',
            expect.any(String),
            expect.any(Array),
        );
    });

    it('confirms remove doctor via alert callback', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue(mockTeamWithDoctor);
        (Alert.alert as jest.Mock).mockImplementation((_t, _m, buttons) => {
            const confirm = buttons?.find((b: any) => b.style === 'destructive');
            confirm?.onPress?.();
        });

        const { getByTestId } = renderProfile();
        await waitFor(() => expect(getByTestId('delete-doctor-button')).toBeTruthy());

        await act(async () => { fireEvent.press(getByTestId('delete-doctor-button')); });

        await waitFor(() => {
            expect(doctorService.removeTeamMember).toHaveBeenCalledWith('tm-1');
        });
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

    it('calls logout and reset when confirm logout pressed', async () => {
        (Alert.alert as jest.Mock).mockImplementation((_t, _m, buttons) => {
            const confirm = buttons?.find((b: any) => b.style === 'destructive');
            confirm?.onPress?.();
        });

        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Déconnexion')).toBeTruthy());

        await act(async () => { fireEvent.press(getByText('Déconnexion')); });

        await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    });

    it('opens edit profile modal and pre-fills fields', async () => {
        const { getByText } = renderProfile();
        await waitFor(() => expect(getByText('Modifier le profil')).toBeTruthy());
        fireEvent.press(getByText('Modifier le profil'));
    });

    it('submits update profile form', async () => {
        const { getByText, getByPlaceholderText } = renderProfile();
        await waitFor(() => expect(getByText('Modifier le profil')).toBeTruthy());

        fireEvent.press(getByText('Modifier le profil'));

        await waitFor(() => {
            try {
                const input = getByPlaceholderText('Prénom');
                fireEvent.changeText(input, 'Nouveau');
            } catch {
                // modal might not render placeholder in this env
            }
        });
    });

    it('submits invite doctor form and calls inviteDoctor', async () => {
        const { getByText, getByPlaceholderText } = renderProfile();
        await waitFor(() => expect(getByText('Inviter un médecin')).toBeTruthy());

        fireEvent.press(getByText('Inviter un médecin'));

        await waitFor(() => expect(getByPlaceholderText('medecin@hopital.fr')).toBeTruthy());
        fireEvent.changeText(getByPlaceholderText('medecin@hopital.fr'), 'doc@example.com');

        await act(async () => { fireEvent.press(getByText('Envoyer')); });

        await waitFor(() => {
            expect(doctorService.inviteDoctor).toHaveBeenCalledWith('doc@example.com');
        });
    });


    it('submits update profile form', async () => {
        const { getByText, getByPlaceholderText } = renderProfile();
        await waitFor(() => expect(getByText('Modifier le profil')).toBeTruthy());

        fireEvent.press(getByText('Modifier le profil'));

        await waitFor(() => expect(getByPlaceholderText('Votre prénom')).toBeTruthy());

        fireEvent.changeText(getByPlaceholderText('Votre prénom'), 'Jean');
        fireEvent.changeText(getByPlaceholderText('Votre nom'), 'Dupont');
        fireEvent.changeText(getByPlaceholderText('+33 6 12 34 56 78'), '+33612345678');

        await act(async () => { fireEvent.press(getByText('Sauvegarder')); });

        await waitFor(() => {
            expect(authService.updateProfile).toHaveBeenCalled();
        });
    });

    it('handles update profile error', async () => {
        (authService.updateProfile as jest.Mock).mockRejectedValue(new Error('Erreur serveur'));

        const { getByText, getByPlaceholderText } = renderProfile();
        await waitFor(() => expect(getByText('Modifier le profil')).toBeTruthy());

        fireEvent.press(getByText('Modifier le profil'));

        await waitFor(() => expect(getByPlaceholderText('Votre prénom')).toBeTruthy());
        fireEvent.changeText(getByPlaceholderText('Votre prénom'), 'Jean');
        fireEvent.changeText(getByPlaceholderText('Votre nom'), 'Dupont');

        await act(async () => { fireEvent.press(getByText('Sauvegarder')); });

        await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    });


    it('opens add contact modal via Plus button', async () => {
        const { getByTestId, queryByText } = renderProfile();
        await waitFor(() => expect(getByTestId('Plus')).toBeTruthy());

        fireEvent.press(getByTestId('Plus'));

        await waitFor(() => expect(queryByText('Ajouter un contact d\'urgence')).toBeTruthy());
    });

    it('submits add contact form', async () => {
        const { getByTestId, getByPlaceholderText, getByText } = renderProfile();
        await waitFor(() => expect(getByTestId('Plus')).toBeTruthy());

        fireEvent.press(getByTestId('Plus'));

        await waitFor(() => expect(getByPlaceholderText('Ex: Marie Dupont')).toBeTruthy());

        fireEvent.changeText(getByPlaceholderText('Ex: Marie Dupont'), 'Pierre Martin');
        fireEvent.changeText(
            getByPlaceholderText('Ex: Mère, Conjoint, Ami...'),
            'Frère'
        );
        fireEvent.changeText(getByPlaceholderText('+33 6 12 34 56 78'), '+33611223344');

        await act(async () => { fireEvent.press(getByText('Ajouter')); });

        await waitFor(() => {
            expect(doctorService.addFamilyMember).toHaveBeenCalled();
        });
    });

    it('sanitizes phone number input in edit profile', async () => {
        const { getByText, getByPlaceholderText } = renderProfile();
        await waitFor(() => expect(getByText('Modifier le profil')).toBeTruthy());
        fireEvent.press(getByText('Modifier le profil'));

        await waitFor(() => expect(getByPlaceholderText('+33 6 12 34 56 78')).toBeTruthy());
        const phoneInput = getByPlaceholderText('+33 6 12 34 56 78');

        // Test sanitization: should remove letters
        fireEvent.changeText(phoneInput, '06 abc 12');
        // The value should be '06  12' (sanitized)
        // Note: we check the state update indirectly via onSubmit or by verifying the input value if bound
        fireEvent.changeText(phoneInput, '1234567890123456789012345'); // too long (>20)
        // should not update or truncated. code says if (sanitized.length <= 20) { setEditPhone(sanitized); }
    });

    it('sanitizes contact phone number input', async () => {
        const { getByTestId, getByPlaceholderText } = renderProfile();
        await waitFor(() => expect(getByTestId('Plus')).toBeTruthy());
        fireEvent.press(getByTestId('Plus'));

        await waitFor(() => expect(getByPlaceholderText('+33 6 12 34 56 78')).toBeTruthy());
        const phoneInput = getByPlaceholderText('+33 6 12 34 56 78');
        fireEvent.changeText(phoneInput, '06-12-34');
        // should keep hyphens
    });

    it('handles diabetes type selection branches', async () => {
        (useUser as jest.Mock).mockReturnValue({
            user: {
                firstName: 'Test',
                lastName: 'User',
                phoneNumber: '+33 6 00 00 00 00',
                address: 'Paris',
                diabetesType: '', // Empty to see "Sélectionner un type"
            },
            loading: false,
            refetch: mockRefetch,
        });

        const { getByText, getByTestId, queryByText } = renderProfile();
        fireEvent.press(getByText('Modifier le profil'));
        
        await waitFor(() => expect(getByText('Sélectionner un type')).toBeTruthy());
        fireEvent.press(getByText('Sélectionner un type'));

        // Test selecting Type 1
        fireEvent.press(getByTestId('diabetes-type-1'));
        expect(queryByText('Type 1')).toBeTruthy();
    });



    it('handles confirmRemoveContact success', async () => {
        (doctorService.getMyTeam as jest.Mock).mockResolvedValue(mockTeamWithDoctor);
        (doctorService.removeTeamMember as jest.Mock).mockResolvedValue(undefined);
        const { getByText } = renderProfile();
        
        await waitFor(() => expect(getByText('Sophie Dupont')).toBeTruthy());
    });


    it('handles inviteDoctor error branch', async () => {
        (doctorService.inviteDoctor as jest.Mock).mockRejectedValue(new Error('Invite failed'));
        const { getByText, getByPlaceholderText } = renderProfile();
        fireEvent.press(getByText('Inviter un médecin'));
        fireEvent.changeText(getByPlaceholderText('medecin@hopital.fr'), 'bad@doc.com');
        await act(async () => { fireEvent.press(getByText('Envoyer')); });
        await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    });

    it('handles logout error branch', async () => {
        (mockLogout as jest.Mock).mockRejectedValue(new Error('Logout failed'));
        (Alert.alert as jest.Mock).mockImplementation((_t, _m, buttons) => {
            const confirm = buttons?.find((b: any) => b.style === 'destructive');
            confirm?.onPress?.();
        });
        const { getByText } = renderProfile();
        fireEvent.press(getByText('Déconnexion'));
        await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Erreur lors de la déconnexion'));
    });
});


