import { useState, useEffect, useCallback } from 'react';
import procheService from '../services/procheService';
import type { LinkedPatient, ProcheGlycemiaEntry, ProcheDashboard } from '../types/proche.types';

interface UseProcheReturn {
  patient: LinkedPatient | null;
  glycemia: ProcheGlycemiaEntry[];
  dashboard: ProcheDashboard | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

export function useProche(): UseProcheReturn {
  const [patient, setPatient] = useState<LinkedPatient | null>(null);
  const [glycemia, setGlycemia] = useState<ProcheGlycemiaEntry[]>([]);
  const [dashboard, setDashboard] = useState<ProcheDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [p, g, d] = await Promise.all([
      procheService.getLinkedPatient(),
      procheService.getGlycemia(),
      procheService.getDashboard(),
    ]);
    setPatient(p);
    setGlycemia(Array.isArray(g) ? g : []);
    setDashboard(d);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  return { patient, glycemia, dashboard, loading, refreshing, refresh };
}
