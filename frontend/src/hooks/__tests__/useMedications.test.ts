import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMedications } from '../useMedications';
import medicationService from '../../services/medicationService';

jest.mock('../../services/medicationService', () => ({
  list: jest.fn(),
  getToday: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deactivate: jest.fn(),
  markIntake: jest.fn(),
  getIntakeHistory: jest.fn(),
}));

const mockMed = {
  id: 1,
  display_name: 'Doliprane',
  custom_name: 'Doliprane',
  statut: true,
  schedules: [],
};

const mockIntake = {
  id: 10,
  user_medication: 1,
  scheduled_date: '2026-05-09',
  scheduled_time: '08:00:00',
  status: 'pending' as const,
  taken_at: null,
  snoozed_until: null,
  medication_name: 'Doliprane',
};

describe('useMedications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (medicationService.list as jest.Mock).mockResolvedValue([mockMed]);
    (medicationService.getToday as jest.Mock).mockResolvedValue([mockIntake]);
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue([]);
  });

  it('loads medications and today intakes on mount', async () => {
    const { result } = renderHook(() => useMedications());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.medications).toHaveLength(1);
    expect(result.current.todayIntakes).toHaveLength(1);
  });

  it('addMedication updates state and reloads today', async () => {
    const newMed = { ...mockMed, id: 2, display_name: 'Metformine' };
    (medicationService.create as jest.Mock).mockResolvedValue(newMed);

    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.addMedication({
        custom_name: 'Metformine',
        start_date: '2026-05-09',
        doses_per_day: 1,
        meal_timing: 'anytime',
        schedule_times: ['08:00'],
      });
    });

    expect(medicationService.create).toHaveBeenCalled();
    expect(medicationService.getToday).toHaveBeenCalledTimes(2);
  });

  it('addMedication throws on error', async () => {
    (medicationService.create as jest.Mock).mockRejectedValue(new Error('Erreur'));

    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.addMedication({
          custom_name: '',
          start_date: '2026-05-09',
          doses_per_day: 1,
          meal_timing: 'anytime',
          schedule_times: [],
        });
      })
    ).rejects.toThrow('Erreur');
  });

  it('updateMedication updates state', async () => {
    const updated = { ...mockMed, custom_name: 'Updated' };
    (medicationService.update as jest.Mock).mockResolvedValue(updated);

    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean;
    await act(async () => {
      success = await result.current.updateMedication(1, { custom_name: 'Updated' });
    });

    expect(success!).toBe(true);
  });

  it('updateMedication returns false on error', async () => {
    (medicationService.update as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean;
    await act(async () => {
      success = await result.current.updateMedication(1, {});
    });

    expect(success!).toBe(false);
  });

  it('deleteMedication removes from state', async () => {
    (medicationService.delete as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteMedication(1);
    });

    expect(result.current.medications).toHaveLength(0);
  });

  it('deactivateMedication updates statut', async () => {
    (medicationService.deactivate as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deactivateMedication(1);
    });

    expect(result.current.medications[0].statut).toBe(false);
  });

  it('markIntake updates todayIntakes', async () => {
    const updatedIntake = { ...mockIntake, status: 'taken' as const, taken_at: '2026-05-09T08:05:00Z' };
    (medicationService.markIntake as jest.Mock).mockResolvedValue(updatedIntake);

    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean;
    await act(async () => {
      success = await result.current.markIntake(10, { action: 'taken' });
    });

    expect(success!).toBe(true);
    expect(result.current.todayIntakes[0].status).toBe('taken');
  });

  it('markIntake returns false on error', async () => {
    (medicationService.markIntake as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean;
    await act(async () => {
      success = await result.current.markIntake(10, { action: 'taken' });
    });

    expect(success!).toBe(false);
  });

  it('loadHistory populates intakeHistory', async () => {
    const history = [{ ...mockIntake, status: 'taken' as const }];
    (medicationService.getIntakeHistory as jest.Mock).mockResolvedValue(history);

    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadHistory();
    });

    expect(result.current.intakeHistory).toHaveLength(1);
  });

  it('refresh reloads data', async () => {
    const { result } = renderHook(() => useMedications());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(medicationService.list).toHaveBeenCalledTimes(2);
  });
});
