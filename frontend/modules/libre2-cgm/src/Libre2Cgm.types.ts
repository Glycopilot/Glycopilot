/** Successful NFC activation result. */
export type SensorActivation = {
  /** 8-byte UID of the sensor, hex-encoded (16 chars). */
  uid: string;
  /** 6-byte patch-info, hex-encoded (12 chars). */
  patchInfo: string;
  /** BLE MAC address of the sensor, formatted XX:XX:XX:XX:XX:XX. */
  mac: string;
  /** Printed serial number (Abbott base-32 alphabet). */
  serial: string;
  /**
   * Next unlockCount to use on the next NFC unlock.
   * Caller MUST persist this BEFORE the next call to `startActivation`.
   */
  unlockCount: number;
};

export type ActivationFailure = {
  /** Java exception class name (e.g. "NotALibreSensor", "TransceiveFailed"). */
  code: string;
  message: string;
};

/** Parameters used to open a BLE streaming session against an already-activated sensor. */
export type BleSessionParams = {
  uid: string;
  patchInfo: string;
  mac: string;
  /** Same monotonic counter shared with NFC; increment after each successful BLE handshake. */
  unlockCount: number;
};

/** A single glucose measurement extracted from a Libre 2 BLE packet. */
export type GlucoseReading = {
  rawGlucose: number;
  rawTemperature: number;
  temperatureAdjustment: number;
  hasError: boolean;
  /** Computed mg/dL value. Absent if the reading has an error or zero raw. */
  mgdl?: number;
  mmol?: number;
  kind: 'CURRENT' | 'TREND' | 'HISTORY';
  /** Minutes ago, relative to the "current" reading in the same packet. */
  ageMinutes: number;
  isValid: boolean;
};

/** A full 46-byte Libre 2 packet, decoded into structured fields. */
export type GlucosePacket = {
  current: GlucoseReading;
  /** 6 trend points, one per minute (oldest = ageMinutes 6, newest = ageMinutes 1). */
  trend: GlucoseReading[];
  /** 3 history points, one every 15 min (ages 15 / 30 / 45). */
  history: GlucoseReading[];
  /** Total minutes the sensor has been worn, as reported by the sensor. */
  wearTimeMinutes: number;
};

/** Connection state surfaced by the BLE client. */
export type BleConnectionState =
  | 'IDLE'
  | 'SCANNING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'READY'
  | 'DISCONNECTED';

export type BleStateEvent = {
  state: BleConnectionState;
  /** Optional contextual info (e.g. the MAC address being scanned for). */
  info?: string;
};

export type BleErrorEvent = {
  code: string;
  message: string;
};

/** Module-level event map for `addListener`. */
export type Libre2CgmEvents = {
  onSensorActivated: SensorActivation;
  onSensorActivationFailed: ActivationFailure;
  onGlucoseReading: GlucosePacket;
  onBleStateChanged: BleStateEvent;
  onBleError: BleErrorEvent;
};
