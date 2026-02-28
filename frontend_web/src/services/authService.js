import axios from 'axios';

// Configuration de l'API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8006/api';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '10000');

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur request — ajout du token
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh concurrent
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// Intercepteur response — refresh automatique
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
        if (!refreshToken) throw new Error('No refresh token available');

        const response = await axios.post(`${API_URL}/auth/refresh/`, { refresh: refreshToken });
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
        processQueue(refreshError, null);
        isRefreshing = false;
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const authService = {
  /**
   * Connexion utilisateur
   */
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login/', { email, password });
      const { access, refresh, user } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      const data = error.response?.data;

      // ✅ Compte créé mais licence pas encore validée par un admin
      const nonFieldErr = data?.non_field_errors?.[0];
      if (nonFieldErr) {
        const err = new Error(nonFieldErr);
        err.code = 'ACCOUNT_PENDING';
        throw err;
      }

      const message = data?.error || data?.detail || 'Erreur de connexion';
      throw new Error(message);
    }
  },

  /**
   * Inscription utilisateur
   */
  async register(userData) {
    try {
      const payload = {
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        password: userData.password,
        password_confirm: userData.passwordConfirm,
        role: userData.role || 'DOCTOR',
      };

      if (payload.role === 'DOCTOR') {
        payload.license_number = userData.licenseNumber;
        payload.specialty = userData.specialty;
        payload.medical_center_address = userData.medicalCenterAddress;
      }

      const response = await apiClient.post('/auth/register/', payload);
      const { access, refresh, user } = response.data;

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      console.error('authService.register error response:', error.response?.data);
      let message = "Erreur lors de l'inscription";
      if (error.response?.data) {
        if (typeof error.response.data === 'string') message = error.response.data;
        else if (error.response.data.error) message = error.response.data.error;
        else {
          try { message = JSON.stringify(error.response.data); }
          catch (_e) { message = "Erreur lors de l'inscription (voir logs)"; }
        }
      }
      throw new Error(message);
    }
  },

  /**
   * Déconnexion utilisateur
   * POST /auth/logout/ — token lu depuis Authorization header
   */
  async logout() {
    try {
      const token = localStorage.getItem('access_token');
      if (token) await apiClient.post('/auth/logout/');
    } catch (error) {
      console.warn('Logout API warning:', error.response?.status, error.response?.data);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
    return { message: 'Déconnexion réussie' };
  },

  /**
   * Récupérer les infos utilisateur actuel
   */
  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me/');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de la récupération de l'utilisateur";
      throw new Error(message);
    }
  },

  /**
   * Rafraîchir le token d'accès
   */
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post(`${API_URL}/auth/refresh/`, { refresh: refreshToken });
      const { access } = response.data;
      localStorage.setItem('access_token', access);

      return response.data;
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      const message = error.response?.data?.error || error.message || 'Erreur lors du rafraîchissement du token';
      throw new Error(message);
    }
  },

  getTokens() {
    try {
      return {
        accessToken: localStorage.getItem('access_token'),
        refreshToken: localStorage.getItem('refresh_token'),
      };
    } catch (error) {
      return { accessToken: null, refreshToken: null };
    }
  },

  getStoredUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  },

  isAuthenticated() {
    try {
      return !!localStorage.getItem('access_token');
    } catch (error) {
      return false;
    }
  },

  getApiClient() {
    return apiClient;
  },
};

export default authService;