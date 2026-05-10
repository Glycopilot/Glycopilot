import { useCallback, useEffect, useRef, useState } from 'react';

import Libre2Cgm, { GlucoseReading } from 'libre2-cgm';

import glycemiaService from '../services/glycemiaService';

export type Libre2Status =
  | 'IDLE'           // not listening yet
  | 'NO_JUGGLUCO'    // Juggluco app missing
  | 'WAITING'        // listening, no reading received yet
  | 'STREAMING'      // at least one reading received recently
  | 'ERROR';

export type LiveGlucose = {
  mgdl: number;
  measuredAt: Date;
  rate: number;
  serial: string;
};

export type UseLibre2Sensor = {
  status: Libre2Status;
  current: LiveGlucose | null;
  error: string | null;

  /**
   * Begin listening to Juggluco broadcasts. Returns whether Juggluco is
   * installed; if false, the JS side should prompt the user to install it
   * before any reading can arrive.
   */
  start: () => Promise<boolean>;
  /** Stop listening and release the foreground service. */
  stop: () => Promise<void>;
};

/**
 * Bridges Juggluco glucose broadcasts to Glycopilot:
 *  - exposes the latest reading for the UI
 *  - posts each reading to the backend (`/cgm-readings/`) at most once per minute
 *  - tracks listening status so the screen can render the right state
 */
export function useLibre2Sensor(): UseLibre2Sensor {
  const [status, setStatus] = useState<Libre2Status>('IDLE');
  const [current, setCurrent] = useState<LiveGlucose | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPostedAtRef = useRef<number>(0);

  const handleReading = useCallback(async (reading: GlucoseReading) => {
    setStatus('STREAMING');
    setCurrent({
      mgdl: reading.mgdl,
      measuredAt: new Date(reading.timeMs),
      rate: reading.rate,
      serial: reading.serial,
    });

    if (reading.mgdl <= 0) return;

    // Throttle: at most one POST every 55 seconds.
    const nowMs = Date.now();
    if (nowMs - lastPostedAtRef.current < 55_000) return;
    lastPostedAtRef.current = nowMs;

    try {
      await glycemiaService.createCgmReading({
        measured_at: new Date(reading.timeMs).toISOString(),
        value: reading.mgdl,
        unit: 'mg/dL',
        notes: reading.serial ? `Libre serial=${reading.serial}` : undefined,
      });
    } catch (e) {
      console.warn('useLibre2Sensor: backend POST failed', e);
    }
  }, []);

  // Subscribe once on mount.
  useEffect(() => {
    const readingSub = Libre2Cgm.addGlucoseReadingListener(reading => {
      handleReading(reading);
    });
    const stateSub = Libre2Cgm.addListeningStateListener(event => {
      if (!event.listening) {
        setStatus(prev => (prev === 'ERROR' ? prev : 'IDLE'));
      }
    });
    return () => {
      readingSub.remove();
      stateSub.remove();
    };
  }, [handleReading]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const installed = await Libre2Cgm.startListening();
      setStatus(installed ? 'WAITING' : 'NO_JUGGLUCO');
      return installed;
    } catch (e: any) {
      setError(e?.message ?? 'Failed to start listening');
      setStatus('ERROR');
      throw e;
    }
  }, []);

  const stop = useCallback(async () => {
    await Libre2Cgm.stopListening();
    setStatus('IDLE');
  }, []);

  return { status, current, error, start, stop };
}
