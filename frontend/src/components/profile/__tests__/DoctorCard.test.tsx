import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DoctorCard from '../DoctorCard';
import type { Doctor, PendingInvite } from '../DoctorCard';

const mockDoctor: Doctor = {
  name: 'Dr. Jean Dupont',
  specialty: 'Endocrinologie',
  phone: '+33612345678',
  email: 'jean.dupont@hopital.fr',
  address: '10 rue de la Paix, Lyon',
};

const defaultProps = {
  doctor: null,
  pendingInvites: [],
  onCall: jest.fn(),
  onInvite: jest.fn(),
  onAcceptInvite: jest.fn(),
  onCancelInvite: jest.fn(),
  onRemoveDoctor: jest.fn(),
  acceptingId: null,
  cancelingId: null,
  removingDoctor: false,
};

describe('DoctorCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the section title', () => {
    const { getByText } = render(<DoctorCard {...defaultProps} />);
    expect(getByText('Médecin traitant')).toBeTruthy();
  });

  it('shows invite button when no doctor', () => {
    const { getByText } = render(<DoctorCard {...defaultProps} doctor={null} />);
    expect(getByText('Inviter un médecin')).toBeTruthy();
  });

  it('calls onInvite when invite button pressed', () => {
    const onInvite = jest.fn();
    const { getByText } = render(<DoctorCard {...defaultProps} onInvite={onInvite} />);
    fireEvent.press(getByText('Inviter un médecin'));
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('shows doctor name when doctor is present', () => {
    const { getByText } = render(<DoctorCard {...defaultProps} doctor={mockDoctor} />);
    expect(getByText('Dr. Jean Dupont')).toBeTruthy();
  });

  it('shows doctor specialty when provided', () => {
    const { getByText } = render(<DoctorCard {...defaultProps} doctor={mockDoctor} />);
    expect(getByText('Endocrinologie')).toBeTruthy();
  });

  it('calls onCall when phone button pressed', () => {
    const onCall = jest.fn();
    const { getByText } = render(<DoctorCard {...defaultProps} doctor={mockDoctor} onCall={onCall} />);
    fireEvent.press(getByText('Appeler'));
    expect(onCall).toHaveBeenCalledTimes(1);
  });

  it('calls onRemoveDoctor when remove button pressed', () => {
    const onRemoveDoctor = jest.fn();
    const { getByTestId } = render(
      <DoctorCard {...defaultProps} doctor={mockDoctor} onRemoveDoctor={onRemoveDoctor} />
    );
    // The remove button uses an X icon (no text label)
    fireEvent.press(getByTestId('X'));
    expect(onRemoveDoctor).toHaveBeenCalledTimes(1);
  });

  it('renders pending invite card', () => {
    const invite: PendingInvite = {
      id_team_member: 'tm-1',
      doctorName: 'Dr. Martin',
      specialty: 'Cardiologie',
      direction: 'sent',
    };
    const { getByText } = render(
      <DoctorCard {...defaultProps} pendingInvites={[invite]} />
    );
    expect(getByText('Dr. Martin')).toBeTruthy();
  });

  it('shows accept button for received invites', () => {
    const invite: PendingInvite = {
      id_team_member: 'tm-2',
      doctorName: 'Dr. Bernard',
      specialty: null,
      direction: 'received',
    };
    const onAcceptInvite = jest.fn();
    const { getByText } = render(
      <DoctorCard {...defaultProps} pendingInvites={[invite]} onAcceptInvite={onAcceptInvite} />
    );
    fireEvent.press(getByText('Accepter'));
    expect(onAcceptInvite).toHaveBeenCalledWith('tm-2');
  });

  it('calls onCancelInvite for sent invites', () => {
    const invite: PendingInvite = {
      id_team_member: 'tm-3',
      doctorName: 'Dr. Blanc',
      specialty: null,
      direction: 'sent',
    };
    const onCancelInvite = jest.fn();
    const { getByText } = render(
      <DoctorCard {...defaultProps} pendingInvites={[invite]} onCancelInvite={onCancelInvite} />
    );
    fireEvent.press(getByText('Annuler'));
    expect(onCancelInvite).toHaveBeenCalledWith('tm-3');
  });

  it('renders multiple pending invites', () => {
    const invites: PendingInvite[] = [
      { id_team_member: 'tm-1', doctorName: 'Dr. A', specialty: null, direction: 'sent' },
      { id_team_member: 'tm-2', doctorName: 'Dr. B', specialty: null, direction: 'received' },
    ];
    const { getByText } = render(<DoctorCard {...defaultProps} pendingInvites={invites} />);
    expect(getByText('Dr. A')).toBeTruthy();
    expect(getByText('Dr. B')).toBeTruthy();
  });

  it('shows loading indicator on accept button when acceptingId matches', () => {
    const invite: PendingInvite = {
      id_team_member: 'tm-loading',
      doctorName: 'Dr. Loading',
      specialty: null,
      direction: 'received',
    };
    const { queryByText, UNSAFE_getAllByType } = render(
      <DoctorCard {...defaultProps} pendingInvites={[invite]} acceptingId="tm-loading" />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    expect(queryByText('Accepter')).toBeNull();
  });

  it('shows loading indicator on cancel button when cancelingId matches', () => {
    const invite: PendingInvite = {
      id_team_member: 'tm-canceling',
      doctorName: 'Dr. Canceling',
      specialty: null,
      direction: 'sent',
    };
    const { queryByText, UNSAFE_getAllByType } = render(
      <DoctorCard {...defaultProps} pendingInvites={[invite]} cancelingId="tm-canceling" />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    expect(queryByText('Annuler')).toBeNull();
  });

  it('shows loading indicator when removing doctor', () => {
    const { UNSAFE_getAllByType } = render(
      <DoctorCard {...defaultProps} doctor={mockDoctor} removingDoctor />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThan(0);
  });

  it('does not show call button when doctor has no phone', () => {
    const doctorNoPhone: Doctor = { ...mockDoctor, phone: null };
    const { queryByText } = render(<DoctorCard {...defaultProps} doctor={doctorNoPhone} />);
    expect(queryByText('Appeler')).toBeNull();
  });

  it('shows doctor email when provided', () => {
    const { getByText } = render(<DoctorCard {...defaultProps} doctor={mockDoctor} />);
    expect(getByText('jean.dupont@hopital.fr')).toBeTruthy();
  });

  it('shows doctor address when provided', () => {
    const { getByText } = render(<DoctorCard {...defaultProps} doctor={mockDoctor} />);
    expect(getByText('10 rue de la Paix, Lyon')).toBeTruthy();
  });

  it('does not show email section when email is null', () => {
    const doctorNoEmail: Doctor = { ...mockDoctor, email: null };
    const { queryByText } = render(<DoctorCard {...defaultProps} doctor={doctorNoEmail} />);
    expect(queryByText('jean.dupont@hopital.fr')).toBeNull();
  });

  it('shows empty state with "Aucun médecin traitant" when no doctor and no invites', () => {
    const { getByText } = render(<DoctorCard {...defaultProps} />);
    expect(getByText('Aucun médecin traitant')).toBeTruthy();
  });

  it('shows "En attente de confirmation" for sent invites', () => {
    const invite: PendingInvite = {
      id_team_member: 'tm-wait',
      doctorName: 'Dr. Wait',
      specialty: 'Neurologie',
      direction: 'sent',
    };
    const { getByText } = render(<DoctorCard {...defaultProps} pendingInvites={[invite]} />);
    expect(getByText('En attente de confirmation')).toBeTruthy();
    expect(getByText('Neurologie')).toBeTruthy();
  });

  it('shows "Invitation reçue" for received invites', () => {
    const invite: PendingInvite = {
      id_team_member: 'tm-received',
      doctorName: 'Dr. Received',
      specialty: null,
      direction: 'received',
    };
    const { getByText } = render(<DoctorCard {...defaultProps} pendingInvites={[invite]} />);
    expect(getByText('Invitation reçue')).toBeTruthy();
  });

  it('uses testID on delete button', () => {
    const { getByTestId } = render(<DoctorCard {...defaultProps} doctor={mockDoctor} />);
    expect(getByTestId('delete-doctor-button')).toBeTruthy();
  });
});
