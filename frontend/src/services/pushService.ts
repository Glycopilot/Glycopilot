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
    shouldShowBanner: true,
    shouldShowList: true,
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
 * Enregistre le device pour les notifications push.
 *
 * IMPORTANT : Les notifications push nécessitent un **development build**
 * (APK/IPA compilé via EAS). Elles ne fonctionnent PAS dans Expo Go
 * depuis le SDK 49+.
 *
 * Flux :
 *   1. eas build --profile development --platform android
 *   2. Installer l'APK sur le téléphone
 *   3. npx expo start --dev-client
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    console.log('[Push] Notifications require a physical device (not simulator)');
    return null;
  }

  // Détecter si on est dans Expo Go (pas de support push)
  if (!Constants.expoConfig?.extra?.eas?.projectId) {
    console.warn(
      '[Push] No EAS projectId found. Push notifications require a development build, not Expo Go.'
    );
    return null;
  }

  await setupAndroidChannel();

  // Vérifier/demander la permission
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission not granted for push notifications');
    return null;
  }

  try {
    const projectId = Constants.expoConfig.extra.eas.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    // Envoyer au backend
    await apiClient.post('/notifications/push-token/', {
      token,
      device_type: Platform.OS,
    });

    // Sauvegarder localement pour pouvoir le supprimer au logout
    await AsyncStorage.setItem('push_token', token);

    console.log('[Push] Token registered:', token);
    return token;
  } catch (error) {
    console.error('[Push] Failed to register push token:', error);
    console.error(
      '[Push] If you see this in Expo Go, you need a development build. ' +
        'Run: eas build --profile development --platform android'
    );
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
      console.log('[Push] Token unregistered');
    }
  } catch (error) {
    console.error('[Push] Failed to unregister push token:', error);
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
