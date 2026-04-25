import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SensorActivation } from 'libre2-cgm';

/**
 * Persisted state for an activated Libre 2 sensor.
 *
 * The `unlockCount` MUST be incremented and persisted before each new BLE/NFC
 * unlock — losing it desyncs us from the sensor's internal counter and the
 * sensor will reject further connections until the user re-scans NFC.
 *
 * Note: AsyncStorage is unencrypted on Android. The credentials here aren't
 * cryptographic secrets — they're identifiers — but for a production rollout
 * this should move to expo-secure-store.
 */
export type StoredSensor = SensorActivation & {
  /** ms since epoch when the BLE session first delivered a packet. */
  sensorStartMs?: number;
};

const KEY = 'libre2.sensor';

const sensorStorage = {
  async load(): Promise<StoredSensor | null> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSensor;
    } catch {
      await AsyncStorage.removeItem(KEY);
      return null;
    }
  },

  async save(sensor: StoredSensor): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(sensor));
  },

  async patch(partial: Partial<StoredSensor>): Promise<StoredSensor | null> {
    const current = await sensorStorage.load();
    if (!current) return null;
    const next = { ...current, ...partial };
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};

export default sensorStorage;
