import { act, renderHook } from '@testing-library/react-native';

const mockRemoveReading = jest.fn();
const mockRemoveState = jest.fn();
let mockGlucoseListener: ((reading: any) => void) | undefined;
let mockStateListener: ((event: any) => void) | undefined;
const mockNativeModule = {
  hello: jest.fn(),
  isJugglucoInstalled: jest.fn(),
  addListener: jest.fn((eventName: string, listener: (event: any) => void) => {
    if (eventName === 'onGlucoseReading') {
      mockGlucoseListener = listener;
      return { remove: mockRemoveReading };
    }
    mockStateListener = listener;
    return { remove: mockRemoveState };
  }),
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
      mockGlucoseListener = listener;
      return { remove: mockRemoveReading };
    }),
    addListeningStateListener: jest.fn(listener => {
      mockStateListener = listener;
      return { remove: mockRemoveState };
    }),
    startListening: jest.fn(),
    stopListening: jest.fn(),
  };
  return { __esModule: true, default: api, ...api };
});
jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(() => mockNativeModule),
}));

import Libre2Cgm from 'libre2-cgm';
import { useLibre2Sensor } from '../useLibre2Sensor';

describe('useLibre2Sensor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGlucoseListener = undefined;
    mockStateListener = undefined;
    (Libre2Cgm.startListening as jest.Mock).mockResolvedValue(true);
    (Libre2Cgm.stopListening as jest.Mock).mockResolvedValue(undefined);
  });

  it('subscribes to native events and removes subscriptions on unmount', () => {
    const { unmount } = renderHook(() => useLibre2Sensor());

    expect(mockGlucoseListener).toBeDefined();
    expect(mockStateListener).toBeDefined();

    unmount();

    expect(mockRemoveReading).toHaveBeenCalledTimes(1);
    expect(mockRemoveState).toHaveBeenCalledTimes(1);
  });

  it('updates current glucose reading when an event is received', () => {
    const { result } = renderHook(() => useLibre2Sensor());

    act(() => {
      mockGlucoseListener?.({
        mgdl: 112,
        timeMs: Date.UTC(2026, 4, 14, 10, 0, 0),
        rate: 1.2,
        serial: 'SN123',
      });
    });

    expect(result.current.status).toBe('STREAMING');
    expect(result.current.current).toEqual({
      mgdl: 112,
      measuredAt: new Date(Date.UTC(2026, 4, 14, 10, 0, 0)),
      rate: 1.2,
      serial: 'SN123',
    });
  });

  it('starts listening and moves to waiting when Juggluco is installed', async () => {
    const { result } = renderHook(() => useLibre2Sensor());

    await act(async () => {
      await expect(result.current.start()).resolves.toBe(true);
    });

    expect(Libre2Cgm.startListening).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('WAITING');
    expect(result.current.error).toBeNull();
  });

  it('keeps streaming status when start succeeds after a reading', async () => {
    const { result } = renderHook(() => useLibre2Sensor());

    act(() => {
      mockGlucoseListener?.({
        mgdl: 101,
        timeMs: Date.UTC(2026, 4, 14, 10, 0, 0),
        rate: 0,
        serial: 'SN123',
      });
    });

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('STREAMING');
  });

  it('sets NO_JUGGLUCO when the native module reports the app is missing', async () => {
    (Libre2Cgm.startListening as jest.Mock).mockResolvedValueOnce(false);
    const { result } = renderHook(() => useLibre2Sensor());

    await act(async () => {
      await expect(result.current.start()).resolves.toBe(false);
    });

    expect(result.current.status).toBe('NO_JUGGLUCO');
  });

  it('sets ERROR and rethrows when start fails', async () => {
    (Libre2Cgm.startListening as jest.Mock).mockRejectedValueOnce(new Error('native failed'));
    const { result } = renderHook(() => useLibre2Sensor());

    await act(async () => {
      await expect(result.current.start()).rejects.toThrow('native failed');
    });

    expect(result.current.status).toBe('ERROR');
    expect(result.current.error).toBe('native failed');
  });

  it('moves to idle when native listening stops unless already in error', () => {
    const { result } = renderHook(() => useLibre2Sensor());

    act(() => {
      mockStateListener?.({ listening: false });
    });

    expect(result.current.status).toBe('IDLE');
  });

  it('stops listening and sets idle', async () => {
    const { result } = renderHook(() => useLibre2Sensor());

    await act(async () => {
      await result.current.stop();
    });

    expect(Libre2Cgm.stopListening).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('IDLE');
  });
});
