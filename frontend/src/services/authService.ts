import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  LoginResponse,
  RegisterData,
  User,
  ApiError,
} from '../types/auth.types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8006/api';
const API_TIMEOUT = parseInt(
  process.env.EXPO_PUBLIC_API_TIMEOUT || '10000',
  10
);

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

// Créer une instance axios
const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token à chaque requête
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Mécanisme de gestion des refreshes concurrents
let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercepteur pour gérer le rafraîchissement automatique du token
apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si un refresh est en cours, attendre son résultat
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Créer une requête sans les intercepteurs pour éviter les boucles
        const response = await axios.post<{ access: string }>(
          `${API_URL}/auth/refresh`,
          {
            refresh: refreshToken,
          }
        );

        const { access } = response.data;
        await AsyncStorage.setItem('access_token', access);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        processQueue(null, access);
        isRefreshing = false;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Token invalide, nettoyer le stockage
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        console.error(
          'Erreur lors du rafraîchissement du token:',
          refreshError
        );
        processQueue(refreshError, null);
        isRefreshing = false;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Service d'authentification
const authService = {
  /**
   * Connexion utilisateur
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      const { access, refresh, user } = response.data;

      // Stocker les tokens
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const message =
        axiosError.response?.data?.message || 'Erreur de connexion';
      throw new Error(message);
    }
  },

  /**
   * Inscription utilisateur
   */
  async register(
    userData: RegisterData & { passwordConfirm: string }
  ): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/register', {
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        password: userData.password,
        password_confirm: userData.passwordConfirm,
      });

      const { access, refresh, user } = response.data;

      // Stocker les tokens
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<
        ApiError | Record<string, unknown>
      >;

      // Log full backend validation payload to help debugging (temporary)
      console.error(
        'authService.register error response:',
        axiosError.response?.data
      );

      let message = "Erreur lors de l'inscription";
      if (axiosError.response?.data) {
        const data = axiosError.response.data;
        if (typeof data === 'string') {
          message = data;
        } else if ('message' in data && typeof data.message === 'string') {
          message = data.message;
        } else {
          try {
            message = JSON.stringify(data);
          } catch {
            message = "Erreur lors de l'inscription (voir logs)";
          }
        }
      }

      throw new Error(message);
    }
  },

  /**
   * Déconnexion utilisateur
   */
  async logout(): Promise<{ message: string }> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');

      if (refreshToken) {
        await apiClient.post('/auth/logout', {
          refresh: refreshToken,
        });
      }

      // Nettoyer le stockage
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user');

      return { message: 'Déconnexion réussie' };
    } catch (error) {
      // Nettoyer le stockage même en cas d'erreur
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      await AsyncStorage.removeItem('user');

      const axiosError = error as AxiosError<ApiError>;
      const message =
        axiosError.response?.data?.message || 'Erreur de déconnexion';
      throw new Error(message);
    }
  },

  /**
   * Récupérer les infos utilisateur actuel
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      const message =
        axiosError.response?.data?.message ||
        "Erreur lors de la récupération de l'utilisateur";
      throw new Error(message);
    }
  },

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken(): Promise<{ access: string }> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post<{ access: string }>(
        `${API_URL}/auth/refresh`,
        {
          refresh: refreshToken,
        }
      );

      const { access } = response.data;
      await AsyncStorage.setItem('access_token', access);

      return response.data;
    } catch (error) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      const axiosError = error as AxiosError<ApiError>;
      const message =
        axiosError.response?.data?.message ||
        'Erreur lors du rafraîchissement du token';
      throw new Error(message);
    }
  },

  /**
   * Récupérer les tokens stockés
   */
  async getTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
  }> {
    try {
      const accessToken = await AsyncStorage.getItem('access_token');
      const refreshToken = await AsyncStorage.getItem('refresh_token');

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
      return {
        accessToken: null,
        refreshToken: null,
      };
    }
  },

  /**
   * Récupérer l'utilisateur stocké localement
   */
  async getStoredUser(): Promise<User | null> {
    try {
      const user = await AsyncStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      return null;
    }
  },

  /**
   * Vérifier si l'utilisateur est connecté
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return !!token;
    } catch (error) {
      console.error(
        "Erreur lors de la vérification de l'authentification:",
        error
      );
      return false;
    }
  },

  /**
   * Obtenir l'instance axios configurée
   */
  getApiClient(): AxiosInstance {
    return apiClient;
  },
};

export default authService;
