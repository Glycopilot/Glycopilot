import { useState, useEffect, useCallback } from 'react';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { EventSubscription } from 'expo-modules-core';

const STEP_GOAL_KEY = '@glycopilot:step_goal';
const DEFAULT_STEP_GOAL = 8000;

// ── Singleton module-level — survit aux démontages de composants ──────────────
let _subscription: EventSubscription | null = null;
let _isTracking = false;
let _sessionSteps = 0;
let _todaySteps = 0;
let _stepsAtSessionStart = 0;
const _listeners = new Set<() => void>();

const notify = () => _listeners.forEach(fn => fn());

// ─────────────────────────────────────────────────────────────────────────────

interface UsePedometerResult {
  todaySteps: number;
  available: boolean;
  stepGoal: number;
  isTracking: boolean;
  sessionSteps: number;
  setStepGoal: (goal: number) => Promise<void>;
  startTracking: () => void;
  stopTracking: () => void;
}

export function usePedometer(): UsePedometerResult {
  const [, forceUpdate] = useState(0);
  const [available, setAvailable] = useState(false);
  const [stepGoal, setStepGoalInternal] = useState(DEFAULT_STEP_GOAL);

  // S'abonne aux mises à jour du singleton
  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const saved = await AsyncStorage.getItem(STEP_GOAL_KEY);
        if (saved) setStepGoalInternal(Number(saved));

        const { granted } = await Pedometer.requestPermissionsAsync();
        if (!granted) return;
        const isAvailable = await Pedometer.isAvailableAsync();
        setAvailable(isAvailable);
        if (!isAvailable) return;

        // Charger les pas du jour seulement si pas déjà chargés
        if (_todaySteps === 0) {
          const now = new Date();
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          const result = await Pedometer.getStepCountAsync(start, now);
          _todaySteps = result.steps;
          notify();
        }
      } catch {
        // Simulateur ou appareil sans podomètre
      }
    };
    init();
  }, []);

  const startTracking = useCallback(() => {
    if (_isTracking || _subscription) return;
    _stepsAtSessionStart = _todaySteps;
    _sessionSteps = 0;
    _isTracking = true;
    notify();
    try {
      _subscription = Pedometer.watchStepCount(result => {
        _sessionSteps = result.steps;
        _todaySteps = _stepsAtSessionStart + result.steps;
        notify();
      });
    } catch {
      _isTracking = false;
      notify();
    }
  }, []);

  const stopTracking = useCallback(() => {
    _subscription?.remove();
    _subscription = null;
    _isTracking = false;
    notify();
  }, []);

  const setStepGoal = useCallback(async (goal: number) => {
    setStepGoalInternal(goal);
    await AsyncStorage.setItem(STEP_GOAL_KEY, String(goal));
  }, []);

  return {
    todaySteps: _todaySteps,
    available,
    stepGoal,
    isTracking: _isTracking,
    sessionSteps: _sessionSteps,
    setStepGoal,
    startTracking,
    stopTracking,
  };
}
