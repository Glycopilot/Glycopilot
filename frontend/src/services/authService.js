import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8006/api';
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '10000');

// Créer une instance axios
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token à chaque requête
apiClient.interceptors.request.use(
  async config => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Mécanisme de gestion des refreshes concurrents
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercepteur pour gérer le rafraîchissement automatique du token
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Si un refresh est en cours, attendre son résultat
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
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
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        await AsyncStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
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
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe de l'utilisateur
   * @returns {Promise} Réponse contenant les tokens et les infos utilisateur
   */
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
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
      const message = error.response?.data?.error || 'Erreur de connexion';
      throw new Error(message);
    }
  },

  /**
   * Inscription utilisateur
   * @param {object} userData - Données utilisateur
   * @returns {Promise} Réponse contenant les tokens et les infos utilisateur
   */
  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', {
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        password: userData.password,
        password_confirm: userData.passwordConfirm,
      });

      const { access, refresh, user } = response.data;

      if (!access || !refresh || !user) {
        console.error('Invalid response structure:', response.data);
        throw new Error('Réponse invalide du serveur');
      }

      // Stocker les tokens
      await AsyncStorage.setItem('access_token', access);
      await AsyncStorage.setItem('refresh_token', refresh);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      // Log full backend validation payload to help debugging
      console.error('authService.register error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Prefer explicit backend error message(s) when present
      let message = "Erreur lors de l'inscription";
      if (error.response?.data) {
        // If backend returns an object with field errors, stringify it for visibility
        if (typeof error.response.data === 'string') {
          message = error.response.data;
        } else if (error.response.data.error) {
          message = error.response.data.error;
        } else if (error.response.data.detail) {
          message = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          // Try to extract field error messages
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, errs]) => {
              const errArray = Array.isArray(errs) ? errs : [errs];
              return `${field}: ${errArray.join(', ')}`;
            })
            .join('\n');
          message = fieldErrors || "Erreur lors de l'inscription (voir logs)";
        }
      }

      throw new Error(message);
    }
  },

  /**
   * Déconnexion utilisateur
   * @returns {Promise} Confirmation de déconnexion
   */
  async logout() {
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

      const message = error.response?.data?.error || 'Erreur de déconnexion';
      throw new Error(message);
    }
  },

  /**
   * Récupérer les infos utilisateur actuel
   * @returns {Promise} Données utilisateur
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        "Erreur lors de la récupération de l'utilisateur";
      throw new Error(message);
    }
  },

  /**
   * Rafraîchir le token d'accès
   * @returns {Promise} Nouveau token d'accès
   */
  async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refresh: refreshToken,
      });

      const { access } = response.data;
      await AsyncStorage.setItem('access_token', access);

      return response.data;
    } catch (error) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
      const message =
        error.response?.data?.error ||
        error.message ||
        'Erreur lors du rafraîchissement du token';
      throw new Error(message);
    }
  },

  /**
   * Récupérer les tokens stockés
   * @returns {Promise} Objet contenant access_token et refresh_token
   */
  async getTokens() {
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
   * @returns {Promise} Données utilisateur
   */
  async getStoredUser() {
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
   * @returns {Promise} Booléen indiquant si l'utilisateur est connecté
   */
  async isAuthenticated() {
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
   * @returns {object} Instance axios
   */
  getApiClient() {
    return apiClient;
  },
};

export default authService;
