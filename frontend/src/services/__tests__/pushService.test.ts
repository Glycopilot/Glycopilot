process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';

import MockAdapter from 'axios-mock-adapter';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import apiClient from '../apiClient';

// Import after mocks
import {
  registerForPushNotifications,
  unregisterPushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '../pushService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { MAX: 5 },
}));

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const mock = new MockAdapter(apiClient);

beforeEach(() => {
  mock.reset();
  jest.clearAllMocks();
  // Restore device to physical by default
  Object.defineProperty(Device, 'isDevice', { value: true, writable: true });
});

afterAll(() => mock.restore());

describe('registerForPushNotifications', () => {
  it('returns null when not a physical device', async () => {
    Object.defineProperty(Device, 'isDevice', { value: false, writable: true });
    const result = await registerForPushNotifications();
    expect(result).toBeNull();
  });

  it('returns null when permission denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const result = await registerForPushNotifications();
    expect(result).toBeNull();
  });

  it('requests permission and returns null when still denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const result = await registerForPushNotifications();
    expect(result).toBeNull();
  });

  it('registers token when permission already granted and new token', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExpoToken[abc123]' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    mock.onPost('/notifications/push-token/').reply(200);
    const result = await registerForPushNotifications();
    expect(result).toBe('ExpoToken[abc123]');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('push_token', 'ExpoToken[abc123]');
  });

  it('returns saved token without re-registering when same token exists', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExpoToken[same]' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('ExpoToken[same]');
    const result = await registerForPushNotifications();
    expect(result).toBe('ExpoToken[same]');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('returns null and logs warning on 429 rate limit error', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExpoToken[xyz]' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    mock.onPost('/notifications/push-token/').reply(429);
    const result = await registerForPushNotifications();
    expect(result).toBeNull();
  });

  it('returns null on generic error', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'ExpoToken[xyz]' });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    mock.onPost('/notifications/push-token/').reply(500);
    const result = await registerForPushNotifications();
    expect(result).toBeNull();
  });
});

describe('unregisterPushToken', () => {
  it('deletes token from backend and storage when token exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('ExpoToken[del]');
    mock.onDelete('/notifications/push-token/').reply(204);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    await unregisterPushToken();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('push_token');
  });

  it('does nothing when no token saved', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    await unregisterPushToken();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('handles storage error gracefully', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage fail'));
    await expect(unregisterPushToken()).resolves.toBeUndefined();
  });
});

describe('addNotificationReceivedListener', () => {
  it('subscribes and returns a subscription', () => {
    const cb = jest.fn();
    const sub = addNotificationReceivedListener(cb);
    expect(sub).toBeDefined();
    expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledWith(cb);
  });
});

describe('addNotificationResponseListener', () => {
  it('subscribes and returns a subscription', () => {
    const cb = jest.fn();
    const sub = addNotificationResponseListener(cb);
    expect(sub).toBeDefined();
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(cb);
  });
});
