import MockAdapter from 'axios-mock-adapter';
import Libre2Cgm from 'libre2-cgm';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../apiClient';

const mockNativeModule = {
  hello: jest.fn(),
  isJugglucoInstalled: jest.fn(),
  addListener: jest.fn(),
  startListening: jest.fn(),
  stopListening: jest.fn(),
};

jest.mock(
  '../../../modules/libre2-cgm/src/Libre2CgmModule',
  () => ({ __esModule: true, default: mockNativeModule })
);
jest.mock('../../../modules/libre2-cgm', () => {
  const api = {
    addGlucoseReadingListener: jest.fn(listener => {
      mockNativeModule.addListener('onGlucoseReading', listener);
      return { remove: jest.fn() };
    }),
    addListeningStateListener: jest.fn(),
    startListening: jest.fn(),
    stopListening: jest.fn(),
  };
  return { __esModule: true, default: api, ...api };
});
jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(() => mockNativeModule),
}));

import {
  handleLibre2BackgroundReadingForTests,
  resetLibre2BackgroundForTests,
  startLibre2Background,
} from '../libre2BackgroundService';

describe('libre2BackgroundService', () => {
  let warnSpy: jest.SpyInstance;
  let mockApi: MockAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    resetLibre2BackgroundForTests();
    mockNativeModule.addListener.mockReturnValue({ remove: jest.fn() });
    (Libre2Cgm.startListening as jest.Mock).mockRejectedValue(
      new Error('native unavailable')
    );
    mockApi = new MockAdapter(apiClient);
    mockApi.onPost('/glycemia/cgm-readings/').reply(201, { id: 'reading-1' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(null);
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
  });

  afterEach(() => {
    mockApi.restore();
    (Date.now as jest.Mock).mockRestore();
    warnSpy.mockRestore();
  });

  it('starts once and logs native start failures from the fallback module', async () => {
    startLibre2Background();
    startLibre2Background();
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      'libre2 startListening failed:',
      expect.any(Error)
    );
  });

  it('posts valid readings with serial metadata', async () => {
    await handleLibre2BackgroundReadingForTests({
      mgdl: 123,
      timeMs: 1_000_000,
      serial: 'SN123',
    } as any);

    expect(JSON.parse(mockApi.history.post[0].data)).toEqual({
      measured_at: new Date(1_000_000).toISOString(),
      value: 123,
      unit: 'mg/dL',
      notes: 'Libre serial=SN123',
    });
  });

  it('ignores invalid and throttled readings', async () => {
    await handleLibre2BackgroundReadingForTests({ mgdl: 0, timeMs: 1_000_000 } as any);
    await handleLibre2BackgroundReadingForTests({ mgdl: 115, timeMs: 1_000_000 } as any);
    jest.spyOn(Date, 'now').mockReturnValue(1_010_000);
    await handleLibre2BackgroundReadingForTests({ mgdl: 116, timeMs: 1_010_000 } as any);

    expect(mockApi.history.post).toHaveLength(1);
  });

  it('uses current time and omits notes when optional reading fields are absent', async () => {
    await handleLibre2BackgroundReadingForTests({ mgdl: 125 } as any);

    expect(JSON.parse(mockApi.history.post[0].data)).toEqual({
      measured_at: new Date(1_000_000).toISOString(),
      value: 125,
      unit: 'mg/dL',
    });
  });

  it('stores readings locally when the backend post fails', async () => {
    mockApi.resetHandlers();
    mockApi.onPost('/glycemia/cgm-readings/').reply(500);

    await handleLibre2BackgroundReadingForTests({
      mgdl: 140,
      timeMs: 1_000_000,
      serial: 'SN123',
    } as any);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'pending_cgm_readings',
      JSON.stringify([
        {
          measured_at: new Date(1_000_000).toISOString(),
          value: 140,
          unit: 'mg/dL',
          notes: 'Libre serial=SN123',
        },
      ])
    );
  });

  it('flushes pending readings before posting the current reading', async () => {
    const pending = [
      {
        measured_at: new Date(900_000).toISOString(),
        value: 111,
        unit: 'mg/dL',
      },
    ];
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(pending));

    await handleLibre2BackgroundReadingForTests({ mgdl: 125, timeMs: 1_000_000 } as any);

    expect(mockApi.history.post).toHaveLength(2);
    expect(JSON.parse(mockApi.history.post[0].data)).toEqual(pending[0]);
    expect(JSON.parse(mockApi.history.post[1].data)).toEqual({
      measured_at: new Date(1_000_000).toISOString(),
      value: 125,
      unit: 'mg/dL',
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('pending_cgm_readings');
  });
});
