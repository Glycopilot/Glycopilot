import axios, { AxiosError, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LoginResponse,
  RegisterData,
  User,
  ApiError,
} from '../types/auth.types';
import { unregisterPushToken } from './pushService';
import apiClient, { API_URL } from './apiClient';

const storeAuthData = async (access: string, refresh: string, user: User): Promise<void> => {
  await AsyncStorage.setItem('access_token', access);
  await AsyncStorage.setItem('refresh_token', refresh);
  await AsyncStorage.setItem('user', JSON.stringify(user));
};

const mapToUser = (data: Record<string, any>): User => ({
  id: data.id_user,
  email: data.email,
  firstName: data.first_name,
  lastName: data.last_name,
  phoneNumber: data.phone_number,
  address: data.address,
  role: data.profiles?.[0]?.role_name,
  diabetesType: data.profiles?.[0]?.patient_details?.diabetes_type,
});

const extractApiErrorMessage = (
  data: ApiError | string | Record<string, unknown> | undefined,
  fallback: string
): string => {
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if ('error' in data && typeof data.error === 'string') return data.error;
  if ('message' in data && typeof data.message === 'string') return data.message;
  if ('detail' in data && typeof data.detail === 'string') return data.detail;
  return JSON.stringify(data);
};

const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      });
      const data = response.data;
      // 2FA activée : pas de tokens à stocker, l'appelant doit vérifier un code.
      if (data.requires_2fa) {
        return data;
      }
      const { access, refresh, user } = data;
      if (access && refresh && user) {
        await storeAuthData(access, refresh, user);
      }
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const data = axiosError.response?.data;
      throw new Error(data?.error || data?.message || 'Erreur de connexion');
    }
  },

  /** Deuxième étape du login : valide le code reçu par email et stocke les tokens. */
  async verifyTwoFactor(challenge: string, code: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/2fa/verify', {
        challenge,
        code,
      });
      const { access, refresh, user } = response.data;
      if (access && refresh && user) {
        await storeAuthData(access, refresh, user);
      }
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const data = axiosError.response?.data;
      throw new Error(data?.error || data?.message || 'Code invalide');
    }
  },

  /** Envoie un code 2FA par email (pour activer/désactiver). Utilisateur connecté. */
  async sendTwoFactorCode(): Promise<void> {
    await apiClient.post('/auth/2fa/send-code');
  },

  async enableTwoFactor(code: string): Promise<void> {
    try {
      await apiClient.post('/auth/2fa/enable', { code });
    } catch (error) {
      const data = (error as AxiosError<ApiError>).response?.data;
      throw new Error(data?.error || data?.message || "Impossible d'activer la 2FA");
    }
  },

  async disableTwoFactor(code: string): Promise<void> {
    try {
      await apiClient.post('/auth/2fa/disable', { code });
    } catch (error) {
      const data = (error as AxiosError<ApiError>).response?.data;
      throw new Error(data?.error || data?.message || 'Impossible de désactiver la 2FA');
    }
  },

  /** Indique si la 2FA par email est activée pour l'utilisateur connecté. */
  async getTwoFactorStatus(): Promise<boolean> {
    try {
      const response = await apiClient.get<{ two_factor_enabled?: boolean }>('/auth/me');
      return Boolean(response.data?.two_factor_enabled);
    } catch {
      return false;
    }
  },

  async register(
    userData: RegisterData & { passwordConfirm: string }
  ): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<Record<string, any>>('/auth/register', {
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        password: userData.password,
        password_confirm: userData.passwordConfirm,
      });
      const { access, refresh, user: rawUser } = response.data;
      const user: import('../types/auth.types').User = {
        id: rawUser?.id_auth,
        email: rawUser?.email,
        firstName: rawUser?.identity?.first_name,
        lastName: rawUser?.identity?.last_name,
        role: rawUser?.identity?.profiles?.[0]?.role_name,
        diabetesType: rawUser?.identity?.profiles?.[0]?.patient_details?.diabetes_type,
      };
      await storeAuthData(access, refresh, user);
      return { access, refresh, user };
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const data = axiosError.response?.data;
      const message = data?.error || data?.message || "Erreur lors de l'inscription";
      throw new Error(message);
    }
  },

  async logout(): Promise<{ message: string }> {
    try {
      await unregisterPushToken();
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refresh: refreshToken });
      }
    } catch (error) {
      console.warn('Erreur lors de la déconnexion backend:', error);
    }

    try {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user');
    } catch (storageError) {
      console.error('Erreur lors du nettoyage du stockage:', storageError);
    }

    return { message: 'Déconnexion réussie' };
  },

  async getCurrentUser(): Promise<User> {
    console.log('DEBUG: authService.getCurrentUser hit');
    try {
      const response = await apiClient.get<Record<string, any>>('/users/me/');
      return mapToUser(response.data);
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Erreur lors de la récupération de l'utilisateur"
      );
    }
  },

  async updateProfile(
    userData: Partial<{
      firstName: string;
      lastName: string;
      phoneNumber: string;
      address: string;
      diabetesType: string;
    }>
  ): Promise<User> {
    try {
      const payload: Record<string, unknown> = {};
      if (userData.firstName !== undefined) payload.first_name = userData.firstName;
      if (userData.lastName !== undefined) payload.last_name = userData.lastName;
      if (userData.phoneNumber !== undefined) payload.phone_number = userData.phoneNumber;
      if (userData.address !== undefined) payload.address = userData.address;
      if (userData.diabetesType !== undefined) {
        payload.patient_details = { diabetes_type: userData.diabetesType };
      }

      const response = await apiClient.patch<Record<string, any>>('/users/me/', payload);
      const updatedUser = mapToUser(response.data);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || 'Erreur lors de la mise à jour du profil'
      );
    }
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await apiClient.post('/users/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch (error) {
      const axiosError = error as import('axios').AxiosError<{ error?: string }>;
      throw new Error(
        axiosError.response?.data?.error || 'Erreur lors du changement de mot de passe'
      );
    }
  },

  async refreshToken(): Promise<{ access: string }> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await axios.post<{ access: string }>(
        `${API_URL}/auth/refresh`,
        { refresh: refreshToken }
      );
      const { access } = response.data;
      await AsyncStorage.setItem('access_token', access);
      return response.data;
    } catch (error) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || 'Erreur lors du rafraîchissement du token'
      );
    }
  },

  async getTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  },

  async getStoredUser(): Promise<User | null> {
    try {
      const user = await AsyncStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      return null;
    }
  },

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return !!token;
    } catch (error) {
      console.error("Erreur lors de la vérification de l'authentification:", error);
      return false;
    }
  },

  getApiClient(): AxiosInstance {
    return apiClient;
  },
};

export default authService;
