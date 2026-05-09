import { requireOptionalNativeModule } from 'expo';

/**
 * The Kotlin module ships only in custom dev client / production APK builds:
 * Expo Go and iOS builds do not contain it. Using `requireOptionalNativeModule`
 * lets us return null instead of crashing at JS bundle load — callers fall
 * back to a stub that surfaces a clear error when invoked.
 */
const native = requireOptionalNativeModule<NativeApi>('Libre2Cgm');

const stub: NativeApi = {
  hello: () => 'libre2-cgm native module not available on this platform/build',
  isJugglucoInstalled: () => false,
  startListening: () =>
    Promise.reject(
      new Error(
        'Native module Libre2Cgm not available. Install the Glycopilot dev client APK on Android — Expo Go cannot load custom native modules.'
      )
    ),
  stopListening: () => Promise.resolve(),
  addListener: () => ({ remove: () => undefined }),
};

export default native ?? stub;

type NativeApi = {
  hello: () => string;
  isJugglucoInstalled: () => boolean;
  startListening: () => Promise<boolean>;
  stopListening: () => Promise<void>;
  addListener: (event: string, listener: (payload: any) => void) => { remove: () => void };
};
