import { useState, useCallback, useEffect } from 'react';

import medicationService from '../services/medicationService';
import type {
  CreateUserMedicationPayload,
  IntakeActionPayload,
  MedicationIntake,
  UserMedication,
} from '../types/medications.types';

interface UseMedicationsReturn {
  medications: UserMedication[];
  todayIntakes: MedicationIntake[];
  intakeHistory: MedicationIntake[];
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
  addMedication: (payload: CreateUserMedicationPayload) => Promise<UserMedication | null>;
  updateMedication: (id: number, payload: Partial<CreateUserMedicationPayload>) => Promise<boolean>;
  deleteMedication: (id: number) => Promise<boolean>;
  deactivateMedication: (id: number) => Promise<boolean>;
  markIntake: (intakeId: number, payload: IntakeActionPayload) => Promise<boolean>;
  loadHistory: () => Promise<void>;
}

export function useMedications(): UseMedicationsReturn {
  const [medications, setMedications] = useState<UserMedication[]>([]);
  const [todayIntakes, setTodayIntakes] = useState<MedicationIntake[]>([]);
  const [intakeHistory, setIntakeHistory] = useState<MedicationIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [meds, today] = await Promise.all([
      medicationService.list(),
      medicationService.getToday(),
    ]);
    setMedications(meds);
    setTodayIntakes(today);
  }, []);

  const loadHistory = useCallback(async () => {
    const history = await medicationService.getIntakeHistory();
    setIntakeHistory(history);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const addMedication = useCallback(
    async (payload: CreateUserMedicationPayload): Promise<UserMedication | null> => {
      const created = await medicationService.create(payload);
      if (created) {
        setMedications(prev => [created, ...prev]);
        // Reload today's intakes so the new schedules appear
        const today = await medicationService.getToday();
        setTodayIntakes(today);
      }
      return created;
    },
    []
  );

  const updateMedication = useCallback(
    async (id: number, payload: Partial<CreateUserMedicationPayload>): Promise<boolean> => {
      const updated = await medicationService.update(id, payload);
      if (updated) {
        setMedications(prev => prev.map(m => (m.id === id ? updated : m)));
        const today = await medicationService.getToday();
        setTodayIntakes(today);
      }
      return updated !== null;
    },
    []
  );

  const deleteMedication = useCallback(async (id: number): Promise<boolean> => {
    const success = await medicationService.delete(id);
    if (success) {
      setMedications(prev => prev.filter(m => m.id !== id));
      setTodayIntakes(prev => prev.filter(i => i.user_medication !== id));
    }
    return success;
  }, []);

  const deactivateMedication = useCallback(async (id: number): Promise<boolean> => {
    const success = await medicationService.deactivate(id);
    if (success) {
      setMedications(prev =>
        prev.map(m => (m.id === id ? { ...m, statut: false } : m))
      );
    }
    return success;
  }, []);

  const markIntake = useCallback(
    async (intakeId: number, payload: IntakeActionPayload): Promise<boolean> => {
      const updated = await medicationService.markIntake(intakeId, payload);
      if (updated) {
        setTodayIntakes(prev =>
          prev.map(i => (i.id === intakeId ? updated : i))
        );
        // Update or add to history (history excludes 'pending', so add new non-pending entries)
        if (updated.status !== 'pending') {
          setIntakeHistory(prev => {
            const exists = prev.some(i => i.id === intakeId);
            if (exists) return prev.map(i => (i.id === intakeId ? updated : i));
            return [updated, ...prev];
          });
        }
      }
      return updated !== null;
    },
    []
  );

  return {
    medications,
    todayIntakes,
    intakeHistory,
    loading,
    refreshing,
    refresh,
    addMedication,
    updateMedication,
    deleteMedication,
    deactivateMedication,
    markIntake,
    loadHistory,
  };
}
