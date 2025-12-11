import authService from './authService';

const apiClient = authService.getApiClient();

/**
 * Service pour gérer la réinitialisation de mot de passe
 * Utilise les endpoints de django-rest-passwordreset
 */
const passwordService = {
  /**
   * Demander une réinitialisation de mot de passe
   * Envoie un email avec un lien de réinitialisation
   * @param {string} email - Email de l'utilisateur
   * @returns {Promise} Confirmation de l'envoi de l'email
   */
  async requestPasswordReset(email) {
    try {
      const response = await apiClient.post('/password_reset/', {
        email,
      });

      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.response?.data?.email?.[0] ||
        'Erreur lors de la demande de réinitialisation';
      throw new Error(message);
    }
  },

  /**
   * Confirmer la réinitialisation avec un token et nouveau mot de passe
   * @param {string} token - Token de réinitialisation reçu par email
   * @param {string} newPassword - Nouveau mot de passe
   * @returns {Promise} Confirmation de réinitialisation
   */
  async confirmPasswordReset(token, newPassword) {
    try {
      const response = await apiClient.post('/password_reset/confirm/', {
        token,
        password: newPassword,
      });

      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        error.response?.data?.token?.[0] ||
        error.response?.data?.password?.[0] ||
        'Erreur lors de la réinitialisation du mot de passe';
      throw new Error(message);
    }
  },

  /**
   * Vérifier si un token de réinitialisation est valide
   * @param {string} token - Token à vérifier
   * @returns {Promise} Validation du token
   */
  async validatePasswordResetToken(token) {
    try {
      const response = await apiClient.post('/password_reset/validate_token/', {
        token,
      });

      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Token invalide ou expiré';
      throw new Error(message);
    }
  },
};

export default passwordService;
