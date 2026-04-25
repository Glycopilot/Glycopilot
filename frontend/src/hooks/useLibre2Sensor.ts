import { useCallback, useEffect, useRef, useState } from 'react';

import Libre2Cgm, {
  BleConnectionState,
  GlucosePacket,
  GlucoseReading,
  SensorActivation,
} from 'libre2-cgm';

import glycemiaService from '../services/glycemiaService';
import sensorStorage, { StoredSensor } from '../services/sensorStorage';

export type Libre2Status =
  | 'IDLE'
  | 'ACTIVATING'
  | 'ACTIVATED'
  | 'CONNECTING'
  | 'STREAMING'
  | 'ERROR';

export type LiveGlucose = {
  mgdl?: number;
  measuredAt: Date;
  ageMinutes: number;
  isValid: boolean;
};

export type UseLibre2Sensor = {
  status: Libre2Status;
  bleState: BleConnectionState | null;
  sensor: StoredSensor | null;
  /** Last received "current" reading from the sensor. */
  current: LiveGlucose | null;
  error: string | null;

  /** Trigger NFC activation. Resolves once the user has tapped a sensor. */
  activate: () => Promise<void>;
  /** Cancel a pending activation. */
  cancelActivation: () => Promise<void>;
  /** Open a BLE session against the persisted sensor. */
  startStreaming: () => Promise<void>;
  /** Stop the BLE session. */
  stopStreaming: () => Promise<void>;
  /** Forget the persisted sensor (e.g. when replacing the patch). */
  forget: () => Promise<void>;
};

/**
 * High-level hook that wires the libre2-cgm native module to the app:
 *  - persists sensor credentials in AsyncStorage
 *  - drives NFC activation and BLE streaming lifecycle
 *  - posts each "current" glucose reading to the backend (`/cgm-readings/`)
 *  - exposes a `current` state for the UI to render
 */
export function useLibre2Sensor(): UseLibre2Sensor {
  const [sensor, setSensor] = useState<StoredSensor | null>(null);
  const [status, setStatus] = useState<Libre2Status>('IDLE');
  const [bleState, setBleState] = useState<BleConnectionState | null>(null);
  const [current, setCurrent] = useState<LiveGlucose | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPostedAtRef = useRef<number>(0);

  // Load persisted sensor on mount.
  useEffect(() => {
    let mounted = true;
    sensorStorage.load().then(s => {
      if (!mounted) return;
      setSensor(s);
      if (s) setStatus('ACTIVATED');
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to module events.
  useEffect(() => {
    const stateSub = Libre2Cgm.addBleStateListener(event => {
      setBleState(event.state);
      if (event.state === 'READY') setStatus('STREAMING');
      else if (event.state === 'CONNECTING') setStatus('CONNECTING');
      else if (event.state === 'DISCONNECTED' && status === 'STREAMING') {
        setStatus('ACTIVATED');
      }
    });

    const errorSub = Libre2Cgm.addBleErrorListener(event => {
      setError(`${event.code}: ${event.message}`);
      setStatus('ERROR');
    });

    const readingSub = Libre2Cgm.addGlucoseReadingListener(packet => {
      handleIncomingPacket(packet);
    });

    return () => {
      stateSub.remove();
      errorSub.remove();
      readingSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleIncomingPacket = useCallback(async (packet: GlucosePacket) => {
    const reading = packet.current;
    setCurrent(toLive(reading));
    if (!reading.isValid || reading.mgdl == null) return;

    // Throttle: at most one POST every 55 seconds (sensor packets arrive every ~60s).
    const nowMs = Date.now();
    if (nowMs - lastPostedAtRef.current < 55_000) return;
    lastPostedAtRef.current = nowMs;

    try {
      await glycemiaService.createCgmReading({
        measured_at: new Date(nowMs).toISOString(),
        value: reading.mgdl,
        unit: 'mg/dL',
        notes: `Libre2 wear=${packet.wearTimeMinutes}min`,
      });
    } catch (e) {
      console.warn('useLibre2Sensor: backend POST failed', e);
    }
  }, []);

  const activate = useCallback(async () => {
    setError(null);
    setStatus('ACTIVATING');
    try {
      const previous = await sensorStorage.load();
      const nextCount = previous?.unlockCount ?? 1;
      const result: SensorActivation = await Libre2Cgm.startActivation(nextCount);
      const stored: StoredSensor = { ...result };
      await sensorStorage.save(stored);
      setSensor(stored);
      setStatus('ACTIVATED');
    } catch (e: any) {
      setError(e?.message ?? 'Activation failed');
      setStatus('ERROR');
      throw e;
    }
  }, []);

  const cancelActivation = useCallback(async () => {
    await Libre2Cgm.cancelActivation();
    setStatus(sensor ? 'ACTIVATED' : 'IDLE');
  }, [sensor]);

  const startStreaming = useCallback(async () => {
    if (!sensor) throw new Error('No activated sensor');
    setError(null);
    setStatus('CONNECTING');
    await Libre2Cgm.startBleSession({
      uid: sensor.uid,
      patchInfo: sensor.patchInfo,
      mac: sensor.mac,
      unlockCount: sensor.unlockCount,
    });
    // Increment + persist BEFORE the next BLE handshake will need it.
    const next = await sensorStorage.patch({ unlockCount: sensor.unlockCount + 1 });
    if (next) setSensor(next);
  }, [sensor]);

  const stopStreaming = useCallback(async () => {
    await Libre2Cgm.stopBleSession();
    setStatus(sensor ? 'ACTIVATED' : 'IDLE');
  }, [sensor]);

  const forget = useCallback(async () => {
    await Libre2Cgm.stopBleSession().catch(() => undefined);
    await sensorStorage.clear();
    setSensor(null);
    setCurrent(null);
    setBleState(null);
    setStatus('IDLE');
  }, []);

  return {
    status,
    bleState,
    sensor,
    current,
    error,
    activate,
    cancelActivation,
    startStreaming,
    stopStreaming,
    forget,
  };
}

function toLive(reading: GlucoseReading): LiveGlucose {
  return {
    mgdl: reading.mgdl,
    measuredAt: new Date(),
    ageMinutes: reading.ageMinutes,
    isValid: reading.isValid,
  };
}
