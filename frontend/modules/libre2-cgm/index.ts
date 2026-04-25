import { EventSubscription } from 'expo-modules-core';

import Libre2CgmModule from './src/Libre2CgmModule';
import {
  ActivationFailure,
  BleConnectionState,
  BleErrorEvent,
  BleSessionParams,
  BleStateEvent,
  GlucosePacket,
  GlucoseReading,
  Libre2CgmEvents,
  SensorActivation,
} from './src/Libre2Cgm.types';

export type {
  ActivationFailure,
  BleConnectionState,
  BleErrorEvent,
  BleSessionParams,
  BleStateEvent,
  GlucosePacket,
  GlucoseReading,
  Libre2CgmEvents,
  SensorActivation,
};

/** Sanity-check used during Phase 0 smoke tests. */
export function hello(): string {
  return Libre2CgmModule.hello();
}

// ===== NFC activation ======================================================

/**
 * Begin an NFC activation. Resolves with the activation result once the user
 * has tapped a Libre 2 sensor to the back of the phone, or rejects on error
 * (timeout, transceive failure, sensor rejected, etc.).
 *
 * Caller MUST persist the returned `unlockCount` before issuing another
 * activation call.
 */
export function startActivation(unlockCount: number): Promise<SensorActivation> {
  return Libre2CgmModule.startActivation(unlockCount);
}

/** Cancel a pending activation, e.g. when the user leaves the activation screen. */
export function cancelActivation(): Promise<void> {
  return Libre2CgmModule.cancelActivation();
}

// ===== BLE streaming =======================================================

/**
 * Open a BLE session against an already-activated sensor. The sensor must
 * have been activated with [startActivation] earlier; pass the persisted
 * params (uid, patchInfo, mac, unlockCount).
 *
 * Subscribe to `onGlucoseReading` to receive one [GlucosePacket] per minute.
 */
export function startBleSession(params: BleSessionParams): Promise<void> {
  return Libre2CgmModule.startBleSession(params);
}

/** Stop the BLE session and tear down the foreground service. */
export function stopBleSession(): Promise<void> {
  return Libre2CgmModule.stopBleSession();
}

// ===== Event subscriptions =================================================

export function addSensorActivatedListener(
  listener: (event: SensorActivation) => void
): EventSubscription {
  return Libre2CgmModule.addListener('onSensorActivated', listener);
}

export function addActivationFailureListener(
  listener: (event: ActivationFailure) => void
): EventSubscription {
  return Libre2CgmModule.addListener('onSensorActivationFailed', listener);
}

export function addGlucoseReadingListener(
  listener: (event: GlucosePacket) => void
): EventSubscription {
  return Libre2CgmModule.addListener('onGlucoseReading', listener);
}

export function addBleStateListener(
  listener: (event: BleStateEvent) => void
): EventSubscription {
  return Libre2CgmModule.addListener('onBleStateChanged', listener);
}

export function addBleErrorListener(
  listener: (event: BleErrorEvent) => void
): EventSubscription {
  return Libre2CgmModule.addListener('onBleError', listener);
}

export default {
  hello,
  startActivation,
  cancelActivation,
  startBleSession,
  stopBleSession,
  addSensorActivatedListener,
  addActivationFailureListener,
  addGlucoseReadingListener,
  addBleStateListener,
  addBleErrorListener,
};
