import authService from './authService';
import { AxiosError } from 'axios';

const apiClient = authService.getApiClient();

interface PasswordResetResponse {
  status: string;
  detail?: string;
}

interface ValidationResponse {
  status: string;
}

/**
 * Service pour gérer la réinitialisation de mot de passe
 * Utilise les endpoints de django-rest-passwordreset
 */
const passwordService = {
  /**
   * Demander une réinitialisation de mot de passe
   * Envoie un email avec un lien de réinitialisation
   */
  async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    try {
      const response = await apiClient.post<PasswordResetResponse>(
        '/password_reset/',
        {
          email,
        }
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{
        error?: string;
        detail?: string;
        email?: string[];
      }>;

      const message =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.email?.[0] ||
        'Erreur lors de la demande de réinitialisation';
      throw new Error(message);
    }
  },

  /**
   * Confirmer la réinitialisation avec un token et nouveau mot de passe
   */
  async confirmPasswordReset(
    token: string,
    newPassword: string
  ): Promise<PasswordResetResponse> {
    try {
      const response = await apiClient.post<PasswordResetResponse>(
        '/password_reset/confirm/',
        {
          token,
          password: newPassword,
        }
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{
        error?: string;
        detail?: string;
        token?: string[];
        password?: string[];
      }>;

      const message =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.token?.[0] ||
        axiosError.response?.data?.password?.[0] ||
        'Erreur lors de la réinitialisation du mot de passe';
      throw new Error(message);
    }
  },

  /**
   * Vérifier si un token de réinitialisation est valide
   */
  async validatePasswordResetToken(token: string): Promise<ValidationResponse> {
    try {
      const response = await apiClient.post<ValidationResponse>(
        '/password_reset/validate_token/',
        {
          token,
        }
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{
        error?: string;
        detail?: string;
      }>;

      const message =
        axiosError.response?.data?.error ||
        axiosError.response?.data?.detail ||
        'Token invalide ou expiré';
      throw new Error(message);
    }
  },
};

export default passwordService;
