import { useState, useCallback, useEffect } from 'react';
import mealService from '../services/mealService';
import type { UserMeal, DailySummary, CreateUserMealPayload } from '../types/meals.types';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

interface UseMealsReturn {
  meals: UserMeal[];
  summary: DailySummary | null;
  selectedDate: string;
  loading: boolean;
  refreshing: boolean;
  setDate: (date: string) => void;
  refresh: () => Promise<void>;
  addMeal: (payload: CreateUserMealPayload) => Promise<UserMeal | null>;
  addMeals: (payloads: CreateUserMealPayload[]) => Promise<boolean>;
  deleteMeal: (id: number) => Promise<void>;
}

export function useMeals(): UseMealsReturn {
  const [meals, setMeals] = useState<UserMeal[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (date: string) => {
    try {
      const [log, sum] = await Promise.all([
        mealService.getLog(date),
        mealService.getDailySummary(date),
      ]);
      setMeals(Array.isArray(log) ? log : []);
      setSummary(sum);
    } catch {
      setMeals([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData(selectedDate).finally(() => setLoading(false));
  }, [selectedDate, loadData]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(selectedDate);
    setRefreshing(false);
  }, [selectedDate, loadData]);

  const setDate = useCallback((date: string) => setSelectedDate(date), []);

  const addMeal = useCallback(
    async (payload: CreateUserMealPayload): Promise<UserMeal | null> => {
      try {
        const created = await mealService.addMeal(payload);
        await loadData(selectedDate);
        return created;
      } catch {
        return null;
      }
    },
    [selectedDate, loadData],
  );

  const addMeals = useCallback(
    async (payloads: CreateUserMealPayload[]): Promise<boolean> => {
      try {
        await Promise.all(payloads.map(p => mealService.addMeal(p)));
        await loadData(selectedDate);
        return true;
      } catch {
        return false;
      }
    },
    [selectedDate, loadData],
  );

  const deleteMeal = useCallback(
    async (id: number) => {
      await mealService.deleteMeal(id);
      await loadData(selectedDate);
    },
    [selectedDate, loadData],
  );

  return { meals, summary, selectedDate, loading, refreshing, setDate, refresh, addMeal, addMeals, deleteMeal };
}
