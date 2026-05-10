import { useCallback, useEffect, useState } from 'react';

import Libre2Cgm, { GlucoseReading } from 'libre2-cgm';

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
   * Re-arm the native subscriber and confirm Juggluco is installed.
   * The actual broadcast subscription is owned by libre2BackgroundService
   * (initialised once at app boot), so this is mostly a UX shortcut for the
   * "Activer la surveillance" button.
   */
  start: () => Promise<boolean>;
  /** Stop the native subscriber and tear down the foreground service. */
  stop: () => Promise<void>;
};

/**
 * Screen-level consumer for the Juggluco data stream. Subscribes to the same
 * native `onGlucoseReading` event that [libre2BackgroundService] consumes, but
 * only updates local UI state — it does NOT post to the backend (the
 * background service handles persistence so we don't double-write readings).
 */
export function useLibre2Sensor(): UseLibre2Sensor {
  const [status, setStatus] = useState<Libre2Status>('WAITING');
  const [current, setCurrent] = useState<LiveGlucose | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReading = useCallback((reading: GlucoseReading) => {
    setStatus('STREAMING');
    setCurrent({
      mgdl: reading.mgdl,
      measuredAt: new Date(reading.timeMs),
      rate: reading.rate,
      serial: reading.serial,
    });
  }, []);

  useEffect(() => {
    const readingSub = Libre2Cgm.addGlucoseReadingListener(handleReading);
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
      setStatus(prev =>
        installed ? (prev === 'STREAMING' ? prev : 'WAITING') : 'NO_JUGGLUCO'
      );
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
