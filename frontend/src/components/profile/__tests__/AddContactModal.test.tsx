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
        contactEmail: '',
        onNameChange: jest.fn(),
        onRelationChange: jest.fn(),
        onPhoneChange: jest.fn(),
        onEmailChange: jest.fn(),
        onSubmit: jest.fn(),
    };

    it('renders with title "Ajouter un proche" by default', () => {
        const { getByText } = render(<AddContactModal {...defaultProps} />);
        expect(getByText('Ajouter un proche')).toBeTruthy();
    });

    it('renders with title "Modifier le proche" when isEdit=true', () => {
        const { getByText } = render(<AddContactModal {...defaultProps} isEdit />);
        expect(getByText('Modifier le proche')).toBeTruthy();
    });

    it('shows "Ajouter" button in create mode', () => {
        const { getByText } = render(<AddContactModal {...defaultProps} />);
        expect(getByText('Ajouter')).toBeTruthy();
    });

    it('shows "Enregistrer" button in edit mode', () => {
        const { getByText } = render(<AddContactModal {...defaultProps} isEdit />);
        expect(getByText('Enregistrer')).toBeTruthy();
    });

    it('shows info card only in create mode', () => {
        const { queryByText: queryCreate } = render(<AddContactModal {...defaultProps} />);
        const { queryByText: queryEdit } = render(<AddContactModal {...defaultProps} isEdit />);

        expect(queryCreate('Accès à l\'application')).toBeTruthy();
        expect(queryEdit('Accès à l\'application')).toBeNull();
    });

    it('hides email field in edit mode', () => {
        const { queryByPlaceholderText } = render(<AddContactModal {...defaultProps} isEdit />);
        expect(queryByPlaceholderText('marie@exemple.fr')).toBeNull();
    });

    it('shows email field in create mode', () => {
        const { getByPlaceholderText } = render(<AddContactModal {...defaultProps} />);
        expect(getByPlaceholderText('marie@exemple.fr')).toBeTruthy();
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

    it('calls onSubmit when name and phone are filled', () => {
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

    it('disables submit button when name is empty', () => {
        const onSubmit = jest.fn();
        const { getByText } = render(
            <AddContactModal
                {...defaultProps}
                contactName=""
                contactPhone="+33 6 00 00 00 00"
                onSubmit={onSubmit}
            />,
        );

        fireEvent.press(getByText('Ajouter'));
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('disables submit button when phone is empty', () => {
        const onSubmit = jest.fn();
        const { getByText } = render(
            <AddContactModal
                {...defaultProps}
                contactName="John"
                contactPhone=""
                onSubmit={onSubmit}
            />,
        );

        fireEvent.press(getByText('Ajouter'));
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('calls onClose when cancel is pressed', () => {
        const onClose = jest.fn();
        const { getByText } = render(<AddContactModal {...defaultProps} onClose={onClose} />);
        fireEvent.press(getByText('Annuler'));
        expect(onClose).toHaveBeenCalled();
    });
});
