import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import { registerForPushNotifications, unregisterPushToken } from '../pushService';

describe('pushService', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
    });

    describe('registerForPushNotifications', () => {
        it('should return null if not a physical device', async () => {
            (Device as any).isDevice = false;
            const result = await registerForPushNotifications();
            expect(result).toBeNull();
        });

        it('should return null if EAS projectId is missing', async () => {
            (Device as any).isDevice = true;
            (Constants.expoConfig as any).extra.eas.projectId = null;
            const result = await registerForPushNotifications();
            expect(result).toBeNull();
        });

        it('should register successfully and store token', async () => {
            (Device as any).isDevice = true;
            (Constants.expoConfig as any).extra.eas.projectId = 'test-id';
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
            (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'expo-token' });
            mock.onPost('/notifications/push-token/').reply(200);

            const result = await registerForPushNotifications();

            expect(result).toBe('expo-token');
            expect(AsyncStorage.setItem).toHaveBeenCalledWith('push_token', 'expo-token');
            expect(mock.history.post[0].url).toBe('/notifications/push-token/');
            expect(JSON.parse(mock.history.post[0].data)).toEqual({
                token: 'expo-token',
                device_type: 'ios' // Based on our platform mock or default test env
            });
        });

        it('should request permissions if not already granted', async () => {
            (Device as any).isDevice = true;
            (Constants.expoConfig as any).extra.eas.projectId = 'test-id';
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
            (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
            (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({ data: 'expo-token' });
            mock.onPost('/notifications/push-token/').reply(200);

            await registerForPushNotifications();

            expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
        });

        it('should return null if permissions denied', async () => {
            (Device as any).isDevice = true;
            (Constants.expoConfig as any).extra.eas.projectId = 'test-id';
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
            (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

            const result = await registerForPushNotifications();

            expect(result).toBeNull();
        });

        it('should return null and log error on exception', async () => {
            (Device as any).isDevice = true;
            (Constants.expoConfig as any).extra.eas.projectId = 'test-id';
            (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
            (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(new Error('Push error'));

            const result = await registerForPushNotifications();

            expect(result).toBeNull();
        });
    });

    describe('unregisterPushToken', () => {
        it('should unregister and clear storage if token exists', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue('stored-token');
            mock.onDelete('/notifications/push-token/').reply(200);

            await unregisterPushToken();

            expect(mock.history.delete[0].url).toBe('/notifications/push-token/');
            expect(JSON.parse(mock.history.delete[0].data)).toEqual({ token: 'stored-token' });
            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('push_token');
        });

        it('should do nothing if no token in storage', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

            await unregisterPushToken();

            expect(mock.history.delete.length).toBe(0);
            expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
        });

        it('should log error but not crash on failure', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue('stored-token');
            mock.onDelete('/notifications/push-token/').reply(500);

            await unregisterPushToken();

            // Should still log error (verified by coverage of catch block)
            expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
        });
    });
});
