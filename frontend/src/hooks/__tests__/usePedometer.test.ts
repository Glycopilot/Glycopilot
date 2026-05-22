import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePedometer } from '../usePedometer';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockRequestPermissions = jest.fn();
const mockIsAvailable = jest.fn();
const mockGetStepCount = jest.fn();
const mockWatchStepCount = jest.fn();

jest.mock('expo-sensors', () => ({
  Pedometer: {
    requestPermissionsAsync: mockRequestPermissions,
    isAvailableAsync: mockIsAvailable,
    getStepCountAsync: mockGetStepCount,
    watchStepCount: mockWatchStepCount,
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestPermissions.mockResolvedValue({ granted: true });
  mockIsAvailable.mockResolvedValue(true);
  mockGetStepCount.mockResolvedValue({ steps: 1500 });
  mockWatchStepCount.mockReturnValue({ remove: jest.fn() });
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe('usePedometer', () => {
  it('objectif par défaut à 8000', () => {
    const { result } = renderHook(() => usePedometer());
    expect(result.current.stepGoal).toBe(8000);
  });

  it('charge l\'objectif sauvegardé depuis AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('10000');
    const { result } = renderHook(() => usePedometer());
    await waitFor(() => expect(result.current.stepGoal).toBe(10000));
  });

  it('sauvegarde le nouvel objectif dans AsyncStorage', async () => {
    const { result } = renderHook(() => usePedometer());

    await act(async () => {
      await result.current.setStepGoal(12000);
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@glycopilot:step_goal', '12000');
    expect(result.current.stepGoal).toBe(12000);
  });

  it('stopTracking met isTracking à false après startTracking', () => {
    const { result } = renderHook(() => usePedometer());
    act(() => { result.current.stopTracking(); }); // reset
    act(() => { result.current.startTracking(); });
    act(() => { result.current.stopTracking(); });
    expect(result.current.isTracking).toBe(false);
  });

  it('ne crash pas si le podomètre lance une erreur', () => {
    mockGetStepCount.mockRejectedValue(new Error('Non supporté'));
    expect(() => renderHook(() => usePedometer())).not.toThrow();
  });

  it('ne crash pas si la permission est refusée', () => {
    mockRequestPermissions.mockResolvedValue({ granted: false });
    expect(() => renderHook(() => usePedometer())).not.toThrow();
  });
});
