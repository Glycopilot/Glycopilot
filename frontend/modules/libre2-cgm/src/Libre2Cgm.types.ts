/** A single glucose reading parsed from a Juggluco `glucodata.Minute` broadcast. */
export type GlucoseReading = {
  /** Glucose value in mg/dL — primary value persisted by Glycopilot. */
  mgdl: number;
  /** Glucose value in the user's display unit (mg/dL or mmol/L). */
  glucose: number;
  /** Rate of change in mg/dL/min, sign indicates direction. */
  rate: number;
  /** Sensor reading timestamp, ms since epoch. */
  timeMs: number;
  /** Sensor serial number printed on the patch. May be empty if Juggluco can't decode it. */
  serial: string;
  /** Alarm code: 0 = none. Other values are Juggluco-defined alarm states. */
  alarm: number;
};

export type ListeningStateEvent = {
  listening: boolean;
};

export type Libre2CgmEvents = {
  onGlucoseReading: GlucoseReading;
  onListeningStateChanged: ListeningStateEvent;
};
