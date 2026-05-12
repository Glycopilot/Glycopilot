import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMedications } from '../useMedications';
import medicationService from '../../services/medicationService';

jest.mock('../../services/medicationService', () => ({
  list: jest.fn(),
  getToday: jest.fn(),
  getIntakeHistory: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deactivate: jest.fn(),
  markIntake: jest.fn(),
}));

const mockMeds = [{ id: 1, medication_ref: { name: 'Metformine' } }] as any[];
const mockIntakes = [{ id: 10, user_medication: 1, status: 'pending' }] as any[];
const mockHistory = [{ id: 10, user_medication: 1, status: 'taken' }] as any[];

beforeEach(() => {
  jest.clearAllMocks();
  (medicationService.list as jest.Mock).mockResolvedValue(mockMeds);
  (medicationService.getToday as jest.Mock).mockResolvedValue(mockIntakes);
  (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue(mockHistory);
});

describe('useMedications', () => {
  it('loads medications and today intakes on mount', async () => {
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.medications).toEqual(mockMeds);
    expect(result.current.todayIntakes).toEqual(mockIntakes);
  });

  it('refreshes data on refresh()', async () => {
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.refresh(); });
    expect(medicationService.list).toHaveBeenCalledTimes(2);
  });

  it('loads history on loadHistory()', async () => {
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { await result.current.loadHistory(); });
    expect(result.current.intakeHistory).toEqual(mockHistory);
  });

  it('adds medication and updates state', async () => {
    const newMed = { id: 2, medication_ref: { name: 'Insuline' } } as any;
    (medicationService.create as jest.Mock).mockResolvedValue(newMed);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const created = await result.current.addMedication({ medication_id: 2 } as any);
      expect(created).toEqual(newMed);
    });
    expect(result.current.medications[0]).toEqual(newMed);
  });

  it('updates medication and refreshes intakes', async () => {
    const updated = { ...mockMeds[0], dosage: '1000mg' } as any;
    (medicationService.update as jest.Mock).mockResolvedValue(updated);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const ok = await result.current.updateMedication(1, { dosage: '1000mg' } as any);
      expect(ok).toBe(true);
    });
    expect(result.current.medications[0].dosage).toBe('1000mg');
  });

  it('update returns false when service returns null', async () => {
    (medicationService.update as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const ok = await result.current.updateMedication(1, {} as any);
      expect(ok).toBe(false);
    });
  });

  it('deletes medication and removes from state', async () => {
    (medicationService.delete as jest.Mock).mockResolvedValue(true);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const ok = await result.current.deleteMedication(1);
      expect(ok).toBe(true);
    });
    expect(result.current.medications).toEqual([]);
  });

  it('delete returns false when service fails', async () => {
    (medicationService.delete as jest.Mock).mockResolvedValue(false);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const ok = await result.current.deleteMedication(1);
      expect(ok).toBe(false);
    });
    expect(result.current.medications).toEqual(mockMeds);
  });

  it('deactivates medication and updates statut', async () => {
    (medicationService.deactivate as jest.Mock).mockResolvedValue(true);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const ok = await result.current.deactivateMedication(1);
      expect(ok).toBe(true);
    });
    expect(result.current.medications[0].statut).toBe(false);
  });

  it('deactivate returns false when service fails', async () => {
    (medicationService.deactivate as jest.Mock).mockResolvedValue(false);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const ok = await result.current.deactivateMedication(1);
      expect(ok).toBe(false);
    });
  });

  it('marks intake as taken and updates state', async () => {
    const updatedIntake = { ...mockIntakes[0], status: 'taken' } as any;
    (medicationService.markIntake as jest.Mock).mockResolvedValue(updatedIntake);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const ok = await result.current.markIntake(10, { action: 'taken' } as any);
      expect(ok).toBe(true);
    });
    expect(result.current.todayIntakes[0].status).toBe('taken');
  });

  it('markIntake adds to history when intake not existing', async () => {
    const updatedIntake = { id: 99, user_medication: 1, status: 'taken' } as any;
    (medicationService.markIntake as jest.Mock).mockResolvedValue(updatedIntake);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.markIntake(99, { action: 'taken' } as any);
    });
    expect(result.current.intakeHistory.some(i => i.id === 99)).toBe(true);
  });

  it('markIntake returns false when service returns null', async () => {
    (medicationService.markIntake as jest.Mock).mockResolvedValue(null);
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      const ok = await result.current.markIntake(10, { action: 'taken' } as any);
      expect(ok).toBe(false);
    });
  });
});
