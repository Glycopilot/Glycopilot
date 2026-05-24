import axios from 'axios';
import { devError } from '../lib/logger';
import { triggerAuthRedirect } from '../lib/auth-redirect';
import { flattenAuthMe } from '../lib/utils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8006/api';
const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '10000', 10);

const STORAGE_KEYS = ['access_token', 'refresh_token', 'user_id', 'user_email', 'user', 'user_role'];

// Espace web : réservé aux comptes de type "médecin". Les patients utilisent
// l'application mobile. ADMIN / SUPERADMIN restent autorisés pour le support.
const WEB_ALLOWED_ROLES = ['DOCTOR', 'ADMIN', 'SUPERADMIN'];

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = payload.length % 4;
    if (pad) payload = payload.padEnd(payload.length + (4 - pad), '=');
    return JSON.parse(atob(payload));
  } catch (_e) {
    return null;
  }
}

function extractRoleFromLoginPayload(data) {
  // 1) Priorité au claim "role" du JWT (mis par le backend dans get_tokens_for_user)
  const fromToken = decodeJwtPayload(data?.access)?.role;
  if (typeof fromToken === 'string' && fromToken.trim()) {
    return fromToken.trim().toUpperCase();
  }
  // 2) Fallback : 1er profil retourné dans user.identity.profiles[*].role_name
  const profiles = data?.user?.identity?.profiles;
  if (Array.isArray(profiles) && profiles.length > 0) {
    const name = profiles[0]?.role_name;
    if (typeof name === 'string' && name.trim()) {
      return name.trim().toUpperCase();
    }
  }
  return null;
}

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (error) {
      devError('Erreur lors de la récupération du token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

function clearSession() {
  STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      clearSession();
      return Promise.reject(error);
    }

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
      const response = await axios.post(`${API_URL}/auth/refresh/`, { refresh: refreshToken });
      const { access } = response.data;
      localStorage.setItem('access_token', access);
      originalRequest.headers.Authorization = `Bearer ${access}`;
      processQueue(null, access);
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearSession();
      processQueue(refreshError, null);
      triggerAuthRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

function persistUser(user) {
  if (!user) return;
  if (user.id_auth) localStorage.setItem('user_id', user.id_auth);
  if (user.email) localStorage.setItem('user_email', user.email);
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch (err) {
    devError('Impossible de sérialiser le user dans le storage:', err);
  }
}

const authService = {
  async login(email, password) {
    try {
      const response = await apiClient.post('/auth/login/', { email, password });
      const { access, refresh, user } = response.data;

      // ── Garde-fou : seul un médecin (ou un admin) peut se connecter à l'espace web.
      // Les patients doivent passer par l'application mobile.
      const role = extractRoleFromLoginPayload(response.data);
      if (role && !WEB_ALLOWED_ROLES.includes(role)) {
        clearSession();
        const err = new Error(
          "Cet espace est réservé aux médecins. " +
          "Veuillez utiliser l'application mobile GlycoPilot pour les patients."
        );
        err.code = 'ROLE_NOT_ALLOWED';
        err.role = role;
        throw err;
      }

      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      if (role) localStorage.setItem('user_role', role);
      persistUser(user);

      return response.data;
    } catch (error) {
      // On laisse remonter notre erreur enrichie sans la "perdre"
      if (error?.code === 'ROLE_NOT_ALLOWED') throw error;

      const data = error.response?.data;
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

      if (access) localStorage.setItem('access_token', access);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      persistUser(user);

      return response.data;
    } catch (error) {
      let message = "Erreur lors de l'inscription";
      if (error.response?.data) {
        if (typeof error.response.data === 'string') message = error.response.data;
        else if (error.response.data.error) message = error.response.data.error;
        else {
          try { message = JSON.stringify(error.response.data); }
          catch (_e) { message = "Erreur lors de l'inscription"; }
        }
      }
      throw new Error(message);
    }
  },

  async logout() {
    try {
      const token = localStorage.getItem('access_token');
      if (token) await apiClient.post('/auth/logout/');
    } catch (_error) {
      // Logout côté serveur best-effort — on purge dans tous les cas
    } finally {
      clearSession();
    }
    return { message: 'Déconnexion réussie' };
  },

  async getCurrentUser() {
    try {
      const response = await apiClient.get('/auth/me/');
      const flat = flattenAuthMe(response.data);
      persistUser(flat);
      return flat;
    } catch (error) {
      const message = error.response?.data?.detail || "Erreur lors de la récupération de l'utilisateur";
      throw new Error(message);
    }
  },

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No refresh token available');

      const response = await axios.post(`${API_URL}/auth/refresh/`, { refresh: refreshToken });
      const { access } = response.data;

      // Vérifie une nouvelle fois le rôle embarqué dans le nouveau token.
      const role = decodeJwtPayload(access)?.role;
      if (role && !WEB_ALLOWED_ROLES.includes(String(role).toUpperCase())) {
        clearSession();
        throw new Error('Accès web réservé aux médecins.');
      }

      localStorage.setItem('access_token', access);
      if (role) localStorage.setItem('user_role', String(role).toUpperCase());
      return response.data;
    } catch (error) {
      clearSession();
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
    } catch (_error) {
      return { accessToken: null, refreshToken: null };
    }
  },

  getStoredUser() {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        try { return JSON.parse(raw); }
        catch (_e) { /* fallback ci-dessous */ }
      }
      const userId = localStorage.getItem('user_id');
      const userEmail = localStorage.getItem('user_email');
      if (!userId) return null;
      return { id_auth: userId, email: userEmail };
    } catch (_error) {
      return null;
    }
  },

  isAuthenticated() {
    try {
      return !!localStorage.getItem('access_token');
    } catch (_error) {
      return false;
    }
  },

  /**
   * Retourne le rôle effectif du compte connecté (DOCTOR / ADMIN / SUPERADMIN / PATIENT / null).
   * Lecture prioritaire : `user_role` en storage (posé au login), sinon décodage du JWT.
   */
  getRole() {
    try {
      const stored = localStorage.getItem('user_role');
      if (stored) return stored.toUpperCase();
      const token = localStorage.getItem('access_token');
      const role = decodeJwtPayload(token)?.role;
      return role ? String(role).toUpperCase() : null;
    } catch (_e) {
      return null;
    }
  },

  /**
   * Vrai si le compte connecté est autorisé à accéder à l'espace médecin web.
   */
  isDoctor() {
    const role = this.getRole();
    return !!role && WEB_ALLOWED_ROLES.includes(role);
  },

  getApiClient() {
    return apiClient;
  },
};

export default authService;
