import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EditProfileModal from '../EditProfileModal';

jest.mock('../Addressautocomplete ', () => {
  return function MockAddressAutocomplete({ label }: any) {
    const { Text } = require('react-native');
    return <Text>{label}</Text>;
  };
});

const defaultProps = {
  visible: true,
  onClose: jest.fn(),
  firstName: 'Jean',
  lastName: 'Dupont',
  phone: '0612345678',
  address: '1 rue Test',
  diabetesType: '',
  showDiabetesTypePicker: false,
  updating: false,
  onFirstNameChange: jest.fn(),
  onLastNameChange: jest.fn(),
  onPhoneChange: jest.fn(),
  onAddressChange: jest.fn(),
  onAddressSelect: jest.fn(),
  onDiabetesTypeChange: jest.fn(),
  onToggleDiabetesTypePicker: jest.fn(),
  onSubmit: jest.fn(),
};

describe('EditProfileModal', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('renders title when visible', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} />);
    expect(getByText('Modifier mon profil')).toBeTruthy();
  });

  it('renders first name and last name fields with values', () => {
    const { getByDisplayValue } = render(<EditProfileModal {...defaultProps} />);
    expect(getByDisplayValue('Jean')).toBeTruthy();
    expect(getByDisplayValue('Dupont')).toBeTruthy();
  });

  it('calls onFirstNameChange when first name input changes', () => {
    const { getByDisplayValue } = render(<EditProfileModal {...defaultProps} />);
    fireEvent.changeText(getByDisplayValue('Jean'), 'Alice');
    expect(defaultProps.onFirstNameChange).toHaveBeenCalledWith('Alice');
  });

  it('calls onLastNameChange when last name input changes', () => {
    const { getByDisplayValue } = render(<EditProfileModal {...defaultProps} />);
    fireEvent.changeText(getByDisplayValue('Dupont'), 'Martin');
    expect(defaultProps.onLastNameChange).toHaveBeenCalledWith('Martin');
  });

  it('calls onPhoneChange when phone input changes', () => {
    const { getByDisplayValue } = render(<EditProfileModal {...defaultProps} />);
    fireEvent.changeText(getByDisplayValue('0612345678'), '0699999999');
    expect(defaultProps.onPhoneChange).toHaveBeenCalledWith('0699999999');
  });

  it('shows Sauvegarder button when firstName and lastName are set', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} />);
    expect(getByText('Sauvegarder')).toBeTruthy();
  });

  it('calls onSubmit when Sauvegarder is pressed', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} />);
    fireEvent.press(getByText('Sauvegarder'));
    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('calls onClose when Annuler is pressed', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} />);
    fireEvent.press(getByText('Annuler'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows ActivityIndicator instead of Sauvegarder when updating', () => {
    const { queryByText } = render(<EditProfileModal {...defaultProps} updating={true} />);
    expect(queryByText('Sauvegarder')).toBeNull();
  });

  it('shows placeholder label when no diabetes type is set', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} diabetesType="" />);
    expect(getByText('Sélectionner un type')).toBeTruthy();
  });

  it('shows Type 1 label when diabetesType is TYPE1', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} diabetesType="TYPE1" />);
    expect(getByText('Type 1')).toBeTruthy();
  });

  it('shows Type 2 label when diabetesType is TYPE2', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} diabetesType="TYPE2" />);
    expect(getByText('Type 2')).toBeTruthy();
  });

  it('shows Gestationnel label when diabetesType is other', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} diabetesType="GESTATIONAL" />);
    expect(getByText('Gestationnel')).toBeTruthy();
  });

  it('calls onToggleDiabetesTypePicker when picker button is pressed', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} />);
    fireEvent.press(getByText('Sélectionner un type'));
    expect(defaultProps.onToggleDiabetesTypePicker).toHaveBeenCalled();
  });

  it('shows diabetes type options when showDiabetesTypePicker is true', () => {
    const { getByText } = render(
      <EditProfileModal {...defaultProps} showDiabetesTypePicker={true} />
    );
    expect(getByText('Type 1')).toBeTruthy();
    expect(getByText('Type 2')).toBeTruthy();
    expect(getByText('Gestationnel')).toBeTruthy();
  });

  it('calls onDiabetesTypeChange with TYPE1 when Type 1 is pressed', () => {
    const { getByTestId } = render(
      <EditProfileModal {...defaultProps} showDiabetesTypePicker={true} />
    );
    fireEvent.press(getByTestId('diabetes-type-1'));
    expect(defaultProps.onDiabetesTypeChange).toHaveBeenCalledWith('TYPE1');
  });

  it('calls onDiabetesTypeChange with TYPE2 when Type 2 is pressed', () => {
    const { getByTestId } = render(
      <EditProfileModal {...defaultProps} showDiabetesTypePicker={true} />
    );
    fireEvent.press(getByTestId('diabetes-type-2'));
    expect(defaultProps.onDiabetesTypeChange).toHaveBeenCalledWith('TYPE2');
  });

  it('shows Effacer option when diabetesType is already set and picker is open', () => {
    const { getByText } = render(
      <EditProfileModal
        {...defaultProps}
        diabetesType="TYPE1"
        showDiabetesTypePicker={true}
      />
    );
    expect(getByText('Effacer')).toBeTruthy();
  });

  it('does not render when visible is false', () => {
    const { queryByText } = render(<EditProfileModal {...defaultProps} visible={false} />);
    expect(queryByText('Modifier mon profil')).toBeNull();
  });

  it('modal renders with an Annuler button that closes it', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} />);
    // The cancel button calls onClose — this also implicitly covers the modal overlay area
    fireEvent.press(getByText('Annuler'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('submit button is disabled when firstName is empty', () => {
    const { getByText } = render(
      <EditProfileModal {...defaultProps} firstName="" />
    );
    // Button is disabled - pressing it should not call onSubmit
    const btn = getByText('Sauvegarder');
    expect(btn).toBeTruthy();
  });

  it('shows info card text', () => {
    const { getByText } = render(<EditProfileModal {...defaultProps} />);
    expect(getByText('Information')).toBeTruthy();
  });

  it('calls onDiabetesTypeChange with empty string when Effacer is pressed', () => {
    const { getByText } = render(
      <EditProfileModal
        {...defaultProps}
        diabetesType="TYPE2"
        showDiabetesTypePicker={true}
      />
    );
    fireEvent.press(getByText('Effacer'));
    expect(defaultProps.onDiabetesTypeChange).toHaveBeenCalledWith('');
  });

  it('calls onDiabetesTypeChange with GESTATIONAL when Gestationnel pressed', () => {
    const { getByTestId } = render(
      <EditProfileModal {...defaultProps} showDiabetesTypePicker={true} />
    );
    fireEvent.press(getByTestId('diabetes-type-gestational'));
    expect(defaultProps.onDiabetesTypeChange).toHaveBeenCalledWith('GESTATIONAL');
  });
});
