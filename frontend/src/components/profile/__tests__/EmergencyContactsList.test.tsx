import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmergencyContactsList from '../EmergencyContactsList';

const mockContacts = [
  { id: 'c1', name: 'Alice Martin', relation: 'Sœur', phone: '0601010101' },
  { id: 'c2', name: 'Bob Dupont', relation: 'Frère', phone: '0602020202' },
];

describe('EmergencyContactsList', () => {
  const defaultProps = {
    contacts: mockContacts,
    onAddContact: jest.fn(),
    onCallContact: jest.fn(),
    onDeleteContact: jest.fn(),
  };

  beforeEach(() => { jest.clearAllMocks(); });

  it('renders section title', () => {
    const { getByText } = render(<EmergencyContactsList {...defaultProps} />);
    expect(getByText("Contacts d'urgence")).toBeTruthy();
  });

  it('renders all contact names', () => {
    const { getByText } = render(<EmergencyContactsList {...defaultProps} />);
    expect(getByText('Alice Martin')).toBeTruthy();
    expect(getByText('Bob Dupont')).toBeTruthy();
  });

  it('renders relations', () => {
    const { getByText } = render(<EmergencyContactsList {...defaultProps} />);
    expect(getByText('Sœur')).toBeTruthy();
    expect(getByText('Frère')).toBeTruthy();
  });

  it('renders phone numbers', () => {
    const { getByText } = render(<EmergencyContactsList {...defaultProps} />);
    expect(getByText('0601010101')).toBeTruthy();
    expect(getByText('0602020202')).toBeTruthy();
  });

  it('calls onAddContact when add button is pressed', () => {
    const { getByTestId } = render(<EmergencyContactsList {...defaultProps} />);
    const plusIcon = getByTestId('Plus');
    fireEvent.press(plusIcon.parent!);
    expect(defaultProps.onAddContact).toHaveBeenCalledTimes(1);
  });

  it('renders correctly with empty contacts list', () => {
    const { getByText, queryByText } = render(
      <EmergencyContactsList {...defaultProps} contacts={[]} />
    );
    expect(getByText("Contacts d'urgence")).toBeTruthy();
    expect(queryByText('Alice Martin')).toBeNull();
  });

  it('renders initials for each contact avatar', () => {
    const { getAllByText } = render(<EmergencyContactsList {...defaultProps} />);
    expect(getAllByText('AM').length).toBeGreaterThan(0);
    expect(getAllByText('BD').length).toBeGreaterThan(0);
  });
});
