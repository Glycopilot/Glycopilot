import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

const DEFAULT_DURATION = 3000;

/**
 * Afficher un toast personnalisé avec vibration optionnelle
 * @param {string} type - 'success', 'error', 'info'
 * @param {string} title - Titre du toast
 * @param {string} message - Message du toast
 * @param {number} duration - Durée d'affichage en ms
 * @param {boolean} haptic - Activer la vibration (défaut: true)
 */
export const showToast = async (
  type,
  title,
  message = '',
  duration = DEFAULT_DURATION,
  haptic = true
) => {
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
    duration,
  });
};

/**
 * Toast de succès avec vibration
 */
export const toastSuccess = (title, message = '', haptic = true) => {
  showToast('success', title, message, 2000, haptic);
};

/**
 * Toast d'erreur avec vibration
 */
export const toastError = (title, message = '', haptic = true) => {
  showToast('error', title, message, 3000, haptic);
};

/**
 * Toast d'information avec vibration légère
 */
export const toastInfo = (title, message = '', haptic = true) => {
  showToast('info', title, message, 2500, haptic);
};
