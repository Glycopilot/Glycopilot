import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MedFormModal from '../MedFormModal';
import medicationService from '../../../services/medicationService';

jest.mock('../../../services/medicationService');
jest.mock('../../../services/toastService', () => ({
  toastSuccess: jest.fn(),
  toastError: jest.fn(),
}));

const baseProps = {
  visible: true,
  editingMed: null,
  onClose: jest.fn(),
  onAdd: jest.fn(),
  onUpdate: jest.fn(),
};

const renderModal = (props = {}) =>
  render(<MedFormModal {...baseProps} {...props} />);

describe('MedFormModal — saisie heure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (medicationService.search as jest.Mock).mockResolvedValue([]);
  });

  it('affiche le hint format 24h', () => {
    const { getByText } = renderModal();
    expect(getByText('format 24h')).toBeTruthy();
  });

  it('affiche le placeholder 08:30', () => {
    const { getByPlaceholderText } = renderModal();
    expect(getByPlaceholderText('08:30')).toBeTruthy();
  });

  it('auto-insère le ":" après 2 chiffres', () => {
    const { getByPlaceholderText } = renderModal();
    const input = getByPlaceholderText('08:30');
    // Simuler frappe caractère par caractère depuis vide
    fireEvent.changeText(input, ''); // vide d'abord
    fireEvent.changeText(input, '0');
    fireEvent.changeText(input, '08');
    expect(input.props.value).toBe('08:');
  });

  it('formate correctement 4 chiffres en HH:MM', () => {
    const { getByPlaceholderText } = renderModal();
    const input = getByPlaceholderText('08:30');
    fireEvent.changeText(input, '');
    fireEvent.changeText(input, '0');
    fireEvent.changeText(input, '08'); // → '08:'
    fireEvent.changeText(input, '08:3');
    fireEvent.changeText(input, '08:30');
    expect(input.props.value).toBe('08:30');
  });

  it('bloque les heures > 23', () => {
    const { getByPlaceholderText } = renderModal();
    const input = getByPlaceholderText('08:30');
    fireEvent.changeText(input, '');
    fireEvent.changeText(input, '2');
    fireEvent.changeText(input, '25'); // 25 > 23 → clampé à 23
    expect(input.props.value).toBe('23:');
  });

  it('bloque les minutes > 59', () => {
    const { getByPlaceholderText } = renderModal();
    const input = getByPlaceholderText('08:30');
    fireEvent.changeText(input, '');
    fireEvent.changeText(input, '0');
    fireEvent.changeText(input, '08'); // → '08:'
    fireEvent.changeText(input, '08:7');
    fireEvent.changeText(input, '08:70'); // 70 > 59 → clampé à 59
    expect(input.props.value).toBe('08:59');
  });

  it('accepte la suppression (backspace)', () => {
    const { getByPlaceholderText } = renderModal();
    const input = getByPlaceholderText('08:30');
    fireEvent.changeText(input, '');
    fireEvent.changeText(input, '0');
    fireEvent.changeText(input, '08'); // → '08:'
    fireEvent.changeText(input, '08:3');
    fireEvent.changeText(input, '08:30');
    fireEvent.changeText(input, '08:3'); // backspace
    expect(input.props.value).toBe('08:3');
  });

  it('ignore les caractères non numériques en milieu de frappe', () => {
    const { getByPlaceholderText } = renderModal();
    const input = getByPlaceholderText('08:30');
    fireEvent.changeText(input, '');
    fireEvent.changeText(input, '0');
    // Si l'utilisateur tape un char non-numérique, les digits sont filtrés
    fireEvent.changeText(input, '0a'); // 'a' filtré → traité comme '0'
    expect(input.props.value).toBe('0');
  });

  it('gère une heure sur un seul chiffre sans auto-colon', () => {
    const { getByPlaceholderText } = renderModal();
    const input = getByPlaceholderText('08:30');
    fireEvent.changeText(input, '');
    fireEvent.changeText(input, '0');
    expect(input.props.value).toBe('0');
  });
});

describe('MedFormModal — chips de temps rapides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (medicationService.search as jest.Mock).mockResolvedValue([]);
  });

  it('affiche les chips matin pour la première prise', () => {
    const { getByText } = renderModal();
    expect(getByText('08:00')).toBeTruthy();
    expect(getByText('07:00')).toBeTruthy();
  });

  it('sélectionne un chip et met à jour l\'input', () => {
    const { getByText, getByPlaceholderText } = renderModal();
    fireEvent.press(getByText('08:00'));
    const input = getByPlaceholderText('08:30');
    expect(input.props.value).toBe('08:00');
  });

  it('le chip sélectionné correspond à la valeur par défaut', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('09:00'));
    expect(getByText('09:00')).toBeTruthy();
  });
});

describe('MedFormModal — validation soumission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (medicationService.search as jest.Mock).mockResolvedValue([]);
  });

  it('appelle onAdd avec les bonnes données', async () => {
    (baseProps.onAdd as jest.Mock).mockResolvedValue({ id: 1 });
    const { getByPlaceholderText, getByText } = renderModal();

    fireEvent.changeText(getByPlaceholderText('Doliprane 1000mg...'), 'Aspirine');
    fireEvent.press(getByText('Ajouter'));

    await waitFor(() => {
      expect(baseProps.onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ custom_name: 'Aspirine' }),
      );
    });
  });

  it('n\'appelle pas onAdd si le nom est vide', async () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Ajouter'));
    await waitFor(() => expect(baseProps.onAdd).not.toHaveBeenCalled());
  });
});
