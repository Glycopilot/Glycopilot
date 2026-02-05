import { useState, useEffect, useCallback } from 'react';
import glycemiaService from '../services/glycemiaService';
import type { GlycemiaEntry } from '../types/glycemia.types';

interface UseGlycemiaReturn {
  measurements: GlycemiaEntry[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  currentValue: GlycemiaEntry | null;
  refresh: () => Promise<void>;
  loadHistory: (days: number) => Promise<void>;
  addManualReading: (data: {
    value: number;
    context?:
      | 'fasting'
      | 'preprandial'
      | 'postprandial_1h'
      | 'postprandial_2h'
      | 'bedtime'
      | 'exercise'
      | 'stress'
      | 'correction';
    notes?: string;
  }) => Promise<GlycemiaEntry | null>;
}

/**
 * Hook pour gérer les mesures de glycémie
 * Charge l'historique depuis le backend et permet d'ajouter des mesures
 */
export function useGlycemia(initialDays: number = 7): UseGlycemiaReturn {
  const [measurements, setMeasurements] = useState<GlycemiaEntry[]>([]);
  const [currentValue, setCurrentValue] = useState<GlycemiaEntry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge l'historique de glycémie
   */
  const loadHistory = useCallback(async (days: number = 7) => {
    try {
      setError(null);

      let period: 'day' | 'week' | 'month' = 'week';
      if (days === 1) period = 'day';
      else if (days <= 7) period = 'week';
      else period = 'month';

      const data = await glycemiaService.getHistory({ period });
      setMeasurements(data);
    } catch (err) {
      setError((err as Error).message);
      console.error('useGlycemia.loadHistory error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Charge la valeur actuelle
   */
  const loadCurrent = useCallback(async () => {
    try {
      const current = await glycemiaService.getCurrent();
      setCurrentValue(current);
    } catch (err) {
      console.warn('useGlycemia.loadCurrent error:', err);
    }
  }, []);

  /**
   * Rafraîchit les données
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadHistory(initialDays), loadCurrent()]);
  }, [loadHistory, loadCurrent, initialDays]);

  /**
   * Ajoute une mesure manuelle
   */
  const addManualReading = useCallback(
    async (data: {
      value: number;
      context?:
        | 'fasting'
        | 'preprandial'
        | 'postprandial_1h'
        | 'postprandial_2h'
        | 'bedtime'
        | 'exercise'
        | 'stress'
        | 'correction';
      notes?: string;
    }): Promise<GlycemiaEntry | null> => {
      try {
        const newReading = await glycemiaService.createManualReading({
          measured_at: new Date().toISOString(),
          value: data.value,
          unit: 'mg/dL',
          context: data.context,
          notes: data.notes,
        });

        if (newReading) {
          // Ajouter la nouvelle mesure au début de la liste
          setMeasurements(prev => [newReading, ...prev]);
          setCurrentValue(newReading);
          return newReading;
        }

        return null;
      } catch (err) {
        console.error('useGlycemia.addManualReading error:', err);
        setError((err as Error).message);
        return null;
      }
    },
    []
  );

  // Chargement initial
  useEffect(() => {
    refresh();
  }, []);

  return {
    measurements,
    loading,
    error,
    refreshing,
    currentValue,
    refresh,
    loadHistory,
    addManualReading,
  };
}

export default useGlycemia;
