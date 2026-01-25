// Service de notifications toast pour React Web
// Utilise react-toastify (installation: npm install react-toastify)

import { toast } from 'react-toastify';

const DEFAULT_SUCCESS_DURATION = 2000;
const DEFAULT_ERROR_DURATION = 3000;
const DEFAULT_INFO_DURATION = 2500;

/**
 * Afficher un toast personnalisé
 * @param {string} type - 'success', 'error', 'info', 'warning'
 * @param {string} title - Titre du toast
 * @param {string} message - Message du toast
 * @param {number} duration - Durée d'affichage en ms
 */
export const showToast = (type, title, message = '', duration = 3000) => {
  const content = message ? `${title}: ${message}` : title;

  const options = {
    autoClose: duration,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  };

  switch (type) {
    case 'success':
      toast.success(content, options);
      break;
    case 'error':
      toast.error(content, options);
      break;
    case 'info':
      toast.info(content, options);
      break;
    case 'warning':
      toast.warning(content, options);
      break;
    default:
      toast(content, options);
  }
};

/**
 * Toast de succès
 * @param {string} title - Titre
 * @param {string} message - Message (optionnel)
 */
export const toastSuccess = (title, message = '') => {
  showToast('success', title, message, DEFAULT_SUCCESS_DURATION);
};

/**
 * Toast d'erreur
 * @param {string} title - Titre
 * @param {string} message - Message (optionnel)
 */
export const toastError = (title, message = '') => {
  showToast('error', title, message, DEFAULT_ERROR_DURATION);
};

/**
 * Toast d'information
 * @param {string} title - Titre
 * @param {string} message - Message (optionnel)
 */
export const toastInfo = (title, message = '') => {
  showToast('info', title, message, DEFAULT_INFO_DURATION);
};

/**
 * Toast d'avertissement
 * @param {string} title - Titre
 * @param {string} message - Message (optionnel)
 */
export const toastWarning = (title, message = '') => {
  showToast('warning', title, message, DEFAULT_INFO_DURATION);
};