import { renderHook, act } from '@testing-library/react-native';
import { useLibre2Sensor } from '../useLibre2Sensor';
import Libre2Cgm from 'libre2-cgm';

jest.mock('libre2-cgm', () => ({
  addGlucoseReadingListener: jest.fn(),
  addListeningStateListener: jest.fn(),
  startListening: jest.fn(),
  stopListening: jest.fn(),
}));

describe('useLibre2Sensor hook', () => {
  let mockRemoveReading;
  let mockRemoveState;
  let readingCallback;
  let stateCallback;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveReading = jest.fn();
    mockRemoveState = jest.fn();

    (Libre2Cgm.addGlucoseReadingListener as jest.Mock).mockImplementation((cb) => {
      readingCallback = cb;
      return { remove: mockRemoveReading };
    });

    (Libre2Cgm.addListeningStateListener as jest.Mock).mockImplementation((cb) => {
      stateCallback = cb;
      return { remove: mockRemoveState };
    });
  });

  it('should initialize with WAITING status', () => {
    const { result } = renderHook(() => useLibre2Sensor());
    expect(result.current.status).toBe('WAITING');
    expect(result.current.current).toBeNull();
  });

  it('should update status and current reading when a reading is received', () => {
    const { result } = renderHook(() => useLibre2Sensor());
    
    const mockReading = {
      mgdl: 120,
      timeMs: Date.now(),
      rate: 1,
      serial: 'XYZ',
    };

    act(() => {
      readingCallback(mockReading);
    });

    expect(result.current.status).toBe('STREAMING');
    expect(result.current.current?.mgdl).toBe(120);
    expect(result.current.current?.serial).toBe('XYZ');
  });

  it('should update status to IDLE when listening state becomes false', () => {
    const { result } = renderHook(() => useLibre2Sensor());
    
    act(() => {
      stateCallback({ listening: false });
    });

    expect(result.current.status).toBe('IDLE');
  });

  it('start() should call Libre2Cgm.startListening and update status', async () => {
    (Libre2Cgm.startListening as jest.Mock).mockResolvedValueOnce(true);
    const { result } = renderHook(() => useLibre2Sensor());

    let started;
    await act(async () => {
      started = await result.current.start();
    });

    expect(started).toBe(true);
    expect(Libre2Cgm.startListening).toHaveBeenCalled();
    expect(result.current.status).toBe('WAITING');
  });

  it('start() should set status to NO_JUGGLUCO if Juggluco is not installed', async () => {
    (Libre2Cgm.startListening as jest.Mock).mockResolvedValueOnce(false);
    const { result } = renderHook(() => useLibre2Sensor());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe('NO_JUGGLUCO');
  });

  it('stop() should call Libre2Cgm.stopListening and set status to IDLE', async () => {
    const { result } = renderHook(() => useLibre2Sensor());

    await act(async () => {
      await result.current.stop();
    });

    expect(Libre2Cgm.stopListening).toHaveBeenCalled();
    expect(result.current.status).toBe('IDLE');
  });
});
