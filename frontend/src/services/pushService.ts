import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './apiClient';

// Configuration du comportement des notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configure le canal de notification Android (obligatoire pour Android 8+)
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('glycemia-alerts', {
      name: 'Alertes Glycémie',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
}

/**
 * Enregistre le device pour les notifications push
 * Demande la permission et envoie le token au backend
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  // Les notifications push ne fonctionnent que sur un vrai device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Configurer le canal Android
  await setupAndroidChannel();

  // Vérifier/demander la permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for push notifications');
    return null;
  }

  try {
    // Obtenir le token Expo avec projectId (requis depuis SDK 49+)
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      '181b8eef-e61f-4942-8aa8-2acc377489da';
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;

    // Envoyer au backend
    await apiClient.post('/notifications/push-token/', {
      token: token,
      device_type: Platform.OS,
    });

    // Sauvegarder localement pour pouvoir le supprimer au logout
    await AsyncStorage.setItem('push_token', token);

    console.log('Push token registered:', token);
    return token;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return null;
  }
};

/**
 * Supprime le token push du backend (à appeler au logout)
 */
export const unregisterPushToken = async (): Promise<void> => {
  try {
    const token = await AsyncStorage.getItem('push_token');
    if (token) {
      await apiClient.delete('/notifications/push-token/', {
        data: { token },
      });
      await AsyncStorage.removeItem('push_token');
      console.log('Push token unregistered');
    }
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
};

/**
 * Listener pour les notifications reçues quand l'app est ouverte
 */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
): Notifications.EventSubscription => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Listener pour quand l'utilisateur clique sur une notification
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.EventSubscription => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};
