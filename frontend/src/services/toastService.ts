import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';
import type { ToastType } from '../types/toast.types';

const DEFAULT_DURATION = 3000;

/**
 * Afficher un toast personnalisé avec vibration optionnelle
 */
export const showToast = async (
  type: ToastType,
  title: string,
  message = '',
  duration = DEFAULT_DURATION,
  haptic = true
): Promise<void> => {
  // Ajouter vibration selon le type
  if (haptic) {
    try {
      if (type === 'success') {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } else if (type === 'error') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (type === 'info') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Erreur haptics:', error);
    }
  }

  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: duration,
  });
};

/**
 * Toast de succès avec vibration
 */
export const toastSuccess = (
  title: string,
  message = '',
  haptic = true
): void => {
  showToast('success', title, message, 2000, haptic);
};

/**
 * Toast d'erreur avec vibration
 */
export const toastError = (
  title: string,
  message = '',
  haptic = true
): void => {
  showToast('error', title, message, 3000, haptic);
};

/**
 * Toast d'information avec vibration légère
 */
export const toastInfo = (title: string, message = '', haptic = true): void => {
  showToast('info', title, message, 2500, haptic);
};
