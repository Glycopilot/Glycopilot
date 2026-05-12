import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmergencyContactsList from '../EmergencyContactsList';

const mockContacts = [
    { id: 'c1', name: 'Alice', relation: 'Sœur', phone: '0601' },
];

describe('EmergencyContactsList', () => {
    it('renders correctly and calls callbacks', () => {
        const onAddContact = jest.fn();
        const onCallContact = jest.fn();
        const onDeleteContact = jest.fn();
        const { getByText, getByTestId } = render(
            <EmergencyContactsList 
                contacts={mockContacts} 
                onAddContact={onAddContact} 
                onCallContact={onCallContact} 
                onDeleteContact={onDeleteContact} 
            />
        );
        expect(getByText('Contacts d\'urgence')).toBeTruthy();
        expect(getByText('Alice')).toBeTruthy();
        
        fireEvent.press(getByTestId('add-contact-button'));
        expect(onAddContact).toHaveBeenCalled();
    });

});
