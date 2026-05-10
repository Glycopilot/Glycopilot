import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

function startOfLocalDay(now: Date = new Date()): Date {
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
}

async function readStepsIOS(): Promise<number | null> {
  const available = await Pedometer.isAvailableAsync();
  if (!available) {
    return null;
  }
  const perm = await Pedometer.requestPermissionsAsync();
  if (!perm.granted) {
    return null;
  }
  const start = startOfLocalDay();
  const end = new Date();
  const result = await Pedometer.getStepCountAsync(start, end);
  return Math.max(0, Math.floor(result?.steps ?? 0));
}

async function readStepsAndroid(): Promise<number | null> {
  try {
    const hc = await import('react-native-health-connect');
    const inited = await hc.initialize();
    if (!inited) {
      return null;
    }
    const granted = await hc.requestPermission([
      { accessType: 'read', recordType: 'Steps' },
    ]);
    const ok = granted.some(
      g =>
        'recordType' in g &&
        g.recordType === 'Steps' &&
        g.accessType === 'read'
    );
    if (!ok) {
      return null;
    }
    const start = startOfLocalDay();
    const end = new Date();
    const agg = await hc.aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });
    return Math.max(0, Math.floor(agg.COUNT_TOTAL ?? 0));
  } catch {
    return null;
  }
}

/**
 * Pas cumulés depuis minuit (fuseau local) jusqu’à maintenant.
 * - iOS : Core Motion via `expo-sensors` / Pedometer (équivalent données podomètre Apple).
 * - Android : agrégation Health Connect (pas stockés par l’OS / Google Fit, etc.).
 * - Web : non supporté.
 */
export async function readStepsForToday(): Promise<number | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  if (Platform.OS === 'ios') {
    return readStepsIOS();
  }
  if (Platform.OS === 'android') {
    return readStepsAndroid();
  }
  return null;
}
