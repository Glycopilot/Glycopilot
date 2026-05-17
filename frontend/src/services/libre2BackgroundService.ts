import Libre2Cgm, { GlucoseReading } from 'libre2-cgm';

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
}

async function handleReading(reading: GlucoseReading): Promise<void> {
  if (!reading.mgdl || reading.mgdl <= 0) return;

  // Throttle: at most one POST every 55 seconds (Juggluco emits every 60s).
  const nowMs = Date.now();
  if (nowMs - lastPostedAtMs < 55_000) return;
  lastPostedAtMs = nowMs;

  await glycemiaService.createCgmReading({
    measured_at: new Date(reading.timeMs || nowMs).toISOString(),
    value: reading.mgdl,
    unit: 'mg/dL',
    notes: reading.serial ? `Libre serial=${reading.serial}` : undefined,
  });
}

export function resetLibre2BackgroundForTests(): void {
  started = false;
  lastPostedAtMs = 0;
}

export const handleLibre2BackgroundReadingForTests = handleReading;
