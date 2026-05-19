import Libre2Cgm, { GlucoseReading } from 'libre2-cgm';
import AsyncStorage from '@react-native-async-storage/async-storage';

import glycemiaService from './glycemiaService';

/**
 * App-level Libre 2 / Juggluco subscriber. Initialised once from App.tsx and
 * lives for the entire app lifetime (no cleanup): regardless of which screen
 * the user is on, glucose readings flow to the backend.
 *
 * The SensorActivation screen separately subscribes to the same native event
 * for UI display purposes, but only this service POSTs to the backend so we
 * don't double-write readings.
 */

let started = false;
let lastPostedAtMs = 0;
let flushInProgress = false;

const PENDING_CGM_READINGS_KEY = 'pending_cgm_readings';
const MAX_PENDING_READINGS = 500;

type PendingCgmReading = {
  measured_at: string;
  value: number;
  unit: 'mg/dL';
  notes?: string;
};

export function startLibre2Background(): void {
  if (started) return;
  started = true;

  Libre2Cgm.addGlucoseReadingListener(reading => {
    handleReading(reading).catch(e => {
      console.warn('libre2 background POST failed:', e);
    });
  });

  // Tell the native module to attach the broadcast handler + start the
  // foreground service. Idempotent on the Kotlin side, so calling it from a
  // remount is harmless.
  Libre2Cgm.startListening().catch(e => {
    console.warn('libre2 startListening failed:', e);
  });

  flushPendingReadings().catch(e => {
    console.warn('libre2 pending flush failed:', e);
  });
}

async function handleReading(reading: GlucoseReading): Promise<void> {
  if (!reading.mgdl || reading.mgdl <= 0) return;

  // Throttle: at most one POST every 55 seconds (Juggluco emits every 60s).
  const nowMs = Date.now();
  if (nowMs - lastPostedAtMs < 55_000) return;
  lastPostedAtMs = nowMs;

  await flushPendingReadings();

  const cgmReading: PendingCgmReading = {
    measured_at: new Date(reading.timeMs || nowMs).toISOString(),
    value: reading.mgdl,
    unit: 'mg/dL',
    notes: reading.serial ? `Libre serial=${reading.serial}` : undefined,
  };

  const saved = await glycemiaService.createCgmReading(cgmReading);
  if (!saved) {
    await enqueuePendingReading(cgmReading);
  }
}

export function resetLibre2BackgroundForTests(): void {
  started = false;
  lastPostedAtMs = 0;
  flushInProgress = false;
}

export const handleLibre2BackgroundReadingForTests = handleReading;

async function flushPendingReadings(): Promise<void> {
  if (flushInProgress) return;
  flushInProgress = true;

  try {
    const pending = await readPendingReadings();
    if (pending.length === 0) return;

    const remaining: PendingCgmReading[] = [];
    for (const reading of pending) {
      const saved = await glycemiaService.createCgmReading(reading);
      if (!saved) {
        remaining.push(reading);
      }
    }

    await writePendingReadings(remaining);
  } finally {
    flushInProgress = false;
  }
}

async function enqueuePendingReading(reading: PendingCgmReading): Promise<void> {
  const pending = await readPendingReadings();
  pending.push(reading);
  await writePendingReadings(pending.slice(-MAX_PENDING_READINGS));
}

async function readPendingReadings(): Promise<PendingCgmReading[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_CGM_READINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writePendingReadings(readings: PendingCgmReading[]): Promise<void> {
  if (readings.length === 0) {
    await AsyncStorage.removeItem(PENDING_CGM_READINGS_KEY);
    return;
  }

  await AsyncStorage.setItem(PENDING_CGM_READINGS_KEY, JSON.stringify(readings));
}
