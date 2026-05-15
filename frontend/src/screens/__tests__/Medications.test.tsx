import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import MedicationsScreen from '../Medications';
import { useMedications } from '../../hooks/useMedications';

jest.mock('../../hooks/useMedications');
jest.mock('../../services/toastService', () => ({ toastError: jest.fn() }));
jest.mock('../../components/medications/IntakeCard', () => () => null);
jest.mock('../../components/medications/MedSummaryGrid', () => () => null);
jest.mock('../../components/medications/NextReminderCard', () => () => null);
jest.mock('../../components/medications/ActiveMedList', () => () => null);
jest.mock('../../components/medications/MedFormModal', () => () => null);

const mockNavigation = { navigate: jest.fn() };

const defaultMedications = {
  medications: [],
  todayIntakes: [],
  intakeHistory: [],
  loading: false,
  refreshing: false,
  refresh: jest.fn(),
  addMedication: jest.fn(),
  updateMedication: jest.fn(),
  deleteMedication: jest.fn(),
  markIntake: jest.fn(),
  loadHistory: jest.fn().mockResolvedValue(undefined),
};

describe('Medications Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMedications as jest.Mock).mockReturnValue(defaultMedications);
  });

  it('n\'affiche pas le titre pendant le chargement', () => {
    (useMedications as jest.Mock).mockReturnValue({ ...defaultMedications, loading: true });
    const { queryByText } = render(<MedicationsScreen navigation={mockNavigation as any} />);
    expect(queryByText('Médicaments')).toBeNull();
  });

  it('affiche le titre Médicaments après chargement', async () => {
    const { getByText } = render(<MedicationsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('Médicaments')).toBeTruthy();
    });
  });

  it('affiche les deux onglets', async () => {
    const { getByText } = render(<MedicationsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('À prendre (0)')).toBeTruthy();
      expect(getByText('Historique')).toBeTruthy();
    });
  });

  it('affiche l\'état vide quand aucun intake aujourd\'hui', async () => {
    const { getByText } = render(<MedicationsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText("Aucun médicament aujourd'hui")).toBeTruthy();
    });
  });

  it('affiche le compte de pending dans l\'onglet À prendre', async () => {
    (useMedications as jest.Mock).mockReturnValue({
      ...defaultMedications,
      todayIntakes: [
        { id: '1', status: 'pending', scheduled_time: '08:00', scheduled_date: '2026-01-01', medication_name: 'Metformine' },
        { id: '2', status: 'taken', scheduled_time: '12:00', scheduled_date: '2026-01-01', medication_name: 'Doliprane' },
      ],
    });
    const { getByText } = render(<MedicationsScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(getByText('À prendre (1)')).toBeTruthy();
    });
  });

  it('bascule vers l\'onglet historique et charge l\'historique', async () => {
    const mockLoadHistory = jest.fn().mockResolvedValue(undefined);
    (useMedications as jest.Mock).mockReturnValue({ ...defaultMedications, loadHistory: mockLoadHistory });
    const { getByText } = render(<MedicationsScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Historique')).toBeTruthy());
    fireEvent.press(getByText('Historique'));
    await waitFor(() => {
      expect(mockLoadHistory).toHaveBeenCalled();
    });
  });

  it('affiche Aucun historique dans l\'onglet historique vide', async () => {
    const mockLoadHistory = jest.fn().mockResolvedValue(undefined);
    (useMedications as jest.Mock).mockReturnValue({ ...defaultMedications, loadHistory: mockLoadHistory });
    const { getByText } = render(<MedicationsScreen navigation={mockNavigation as any} />);
    await waitFor(() => expect(getByText('Historique')).toBeTruthy());
    fireEvent.press(getByText('Historique'));
    await waitFor(() => {
      expect(getByText('Aucun historique')).toBeTruthy();
    });
  });
});
