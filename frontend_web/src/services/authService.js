import axios from 'axios';

// Configuration de l'API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8006/api';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '10000');

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
  (config) => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Mécanisme de gestion des refreshes concurrents
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        processQueue(null, access);
        isRefreshing = false;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        console.error('Erreur lors du rafraîchissement du token:', refreshError);
        processQueue(refreshError, null);
        isRefreshing = false;
        window.location.href = '/login';
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
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      });

      const { access, refresh, user } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Erreur de connexion';
      throw new Error(message);
    }
  },

  /**
   * Inscription utilisateur
   * Supporte les rôles DOCTOR et PATIENT (en majuscules).
   * Pour le rôle DOCTOR, les champs licenseNumber, specialty et medicalCenterAddress sont requis.
   */
  async register(userData) {
    try {
      // Payload de base
      const payload = {
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        password: userData.password,
        password_confirm: userData.passwordConfirm,
        role: userData.role || 'DOCTOR',
      };

      // Champs supplémentaires pour les médecins
      if (payload.role === 'DOCTOR') {
        payload.license_number = userData.licenseNumber;
        payload.specialty = userData.specialty;
        payload.medical_center_address = userData.medicalCenterAddress;
      }

      const response = await apiClient.post('/auth/register', payload);

      const { access, refresh, user } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      console.error('authService.register error response:', error.response?.data);

      let message = "Erreur lors de l'inscription";
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          message = error.response.data;
        } else if (error.response.data.error) {
          message = error.response.data.error;
        } else {
          try {
            message = JSON.stringify(error.response.data);
          } catch (_e) {
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
  async logout() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        await apiClient.post('/auth/logout', {
          refresh: refreshToken,
        });
      }

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      return { message: 'Déconnexion réussie' };
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      const message = error.response?.data?.error || 'Erreur de déconnexion';
      throw new Error(message);
    }
  },

  /**
   * Récupérer les infos utilisateur actuel
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
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refresh: refreshToken,
      });

      const { access } = response.data;
      localStorage.setItem('access_token', access);

      return response.data;
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      const message =
        error.response?.data?.error ||
        error.message ||
        'Erreur lors du rafraîchissement du token';
      throw new Error(message);
    }
  },

  /**
   * Récupérer les tokens stockés
   */
  getTokens() {
    try {
      return {
        accessToken: localStorage.getItem('access_token'),
        refreshToken: localStorage.getItem('refresh_token'),
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  },

  /**
   * Récupérer l'utilisateur stocké localement
   */
  getStoredUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      return null;
    }
  },

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated() {
    try {
      return !!localStorage.getItem('access_token');
    } catch (error) {
      console.error("Erreur lors de la vérification de l'authentification:", error);
      return false;
    }
  },

  /**
   * Obtenir l'instance axios configurée
   */
  getApiClient() {
    return apiClient;
  },
};

export default authService;