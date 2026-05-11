import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AddContactModal from '../AddContactModal';

describe('AddContactModal', () => {
    const defaultProps = {
        visible: true,
        onClose: jest.fn(),
        contactName: '',
        contactRelation: '',
        contactPhone: '',
        onNameChange: jest.fn(),
        onRelationChange: jest.fn(),
        onPhoneChange: jest.fn(),
        onSubmit: jest.fn(),
    };

    it('renders when visible', () => {
        const { getByText } = render(<AddContactModal {...defaultProps} />);
        expect(getByText("Ajouter un contact d'urgence")).toBeTruthy();
    });

    it('calls change handlers when typing', () => {
        const onNameChange = jest.fn();
        const onRelationChange = jest.fn();
        const onPhoneChange = jest.fn();

        const { getByPlaceholderText } = render(
            <AddContactModal
                {...defaultProps}
                onNameChange={onNameChange}
                onRelationChange={onRelationChange}
                onPhoneChange={onPhoneChange}
            />,
        );

        fireEvent.changeText(getByPlaceholderText('Ex: Marie Dupont'), 'John Doe');
        fireEvent.changeText(getByPlaceholderText('Ex: Mère, Conjoint, Ami...'), 'Frère');
        fireEvent.changeText(getByPlaceholderText('+33 6 12 34 56 78'), '+33 6 00 00 00 00');

        expect(onNameChange).toHaveBeenCalledWith('John Doe');
        expect(onRelationChange).toHaveBeenCalledWith('Frère');
        expect(onPhoneChange).toHaveBeenCalledWith('+33 6 00 00 00 00');
    });

    it('calls onSubmit when valid and pressed', () => {
        const onSubmit = jest.fn();
        const { getByText } = render(
            <AddContactModal
                {...defaultProps}
                contactName="John"
                contactPhone="+33 6 00 00 00 00"
                onSubmit={onSubmit}
            />,
        );

        fireEvent.press(getByText('Ajouter'));
        expect(onSubmit).toHaveBeenCalled();
    });
});

