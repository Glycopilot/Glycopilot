import { EventSubscription } from 'expo-modules-core';

import Libre2CgmModule from './src/Libre2CgmModule';
import {
  GlucoseReading,
  Libre2CgmEvents,
  ListeningStateEvent,
} from './src/Libre2Cgm.types';

export type { GlucoseReading, Libre2CgmEvents, ListeningStateEvent };

/** Sanity-check used during smoke tests. */
export function hello(): string {
  return Libre2CgmModule.hello();
}

/**
 * True if the Juggluco companion app (`tk.glucodata`) is installed on this
 * device. Glycopilot relies on Juggluco for the BLE link to the Libre 2+ patch.
 */
export function isJugglucoInstalled(): boolean {
  return Libre2CgmModule.isJugglucoInstalled();
}

/**
 * Start listening to Juggluco glucose broadcasts. Spawns the foreground
 * service that keeps Glycopilot eligible to receive broadcasts when the screen
 * is locked.
 *
 * @returns whether Juggluco is installed (so the JS side can warn the user
 *   immediately instead of silently waiting for a broadcast that never arrives).
 */
export function startListening(): Promise<boolean> {
  return Libre2CgmModule.startListening();
}

/** Stop listening and tear down the foreground service. */
export function stopListening(): Promise<void> {
  return Libre2CgmModule.stopListening();
}

export function addGlucoseReadingListener(
  listener: (event: GlucoseReading) => void
): EventSubscription {
  return Libre2CgmModule.addListener('onGlucoseReading', listener);
}

export function addListeningStateListener(
  listener: (event: ListeningStateEvent) => void
): EventSubscription {
  return Libre2CgmModule.addListener('onListeningStateChanged', listener);
}

export default {
  hello,
  isJugglucoInstalled,
  startListening,
  stopListening,
  addGlucoseReadingListener,
  addListeningStateListener,
};
