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

// Service Dashboard
const dashboardService = {
  /**
   * Récupère le résumé complet du dashboard
   * @param {Array<string>} modules - Modules optionnels à inclure (glucose, alerts, medication, nutrition, activity)
   * @returns {Promise} Données agrégées du dashboard
   */
  async getSummary(modules = null) {
    try {
      let url = '/v1/dashboard/summary';

      if (modules && Array.isArray(modules) && modules.length > 0) {
        const params = modules.map(m => `include[]=${m}`).join('&');
        url += `?${params}`;
      }

      const response = await apiClient.get(url);
      return response.data.data;
    } catch (error) {
      console.error('dashboardService.getSummary error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.detail ||
        'Erreur lors du chargement du dashboard';
      throw new Error(message);
    }
  },

  /**
   * Récupère la liste des widgets de l'utilisateur
   * @returns {Promise} Liste des widgets avec leur configuration
   */
  async getWidgets() {
    try {
      const response = await apiClient.get('/v1/dashboard/widgets');
      return response.data.widgets;
    } catch (error) {
      console.error('dashboardService.getWidgets error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.detail ||
        'Erreur lors du chargement des widgets';
      throw new Error(message);
    }
  },

  /**
   * Récupère les layouts (positions et tailles) des widgets
   * @returns {Promise} Liste des layouts des widgets
   */
  async getWidgetLayouts() {
    try {
      const response = await apiClient.get('/v1/dashboard/widgets/layouts');
      return response.data.layouts;
    } catch (error) {
      console.error('dashboardService.getWidgetLayouts error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.detail ||
        'Erreur lors du chargement des layouts';
      throw new Error(message);
    }
  },

  /**
   * Met à jour le layout des widgets
   * @param {Array<object>} layout - Nouveau layout à appliquer
   * @returns {Promise} Layout mis à jour avec timestamp
   */
  async updateWidgetLayout(layout) {
    try {
      const response = await apiClient.patch('/v1/dashboard/widgets/layout', {
        layout,
      });
      return response.data.data;
    } catch (error) {
      console.error('dashboardService.updateWidgetLayout error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Gérer les erreurs de validation spécifiques
      if (error.response?.data?.error) {
        const errorData = error.response.data.error;
        if (errorData.details) {
          // Formatter les détails des erreurs de validation
          const details = errorData.details;
          if (details.layout) {
            const layoutErrors = Array.isArray(details.layout)
              ? details.layout.join(', ')
              : JSON.stringify(details.layout);
            throw new Error(`Erreur de layout: ${layoutErrors}`);
          }
        }
        throw new Error(
          errorData.message || 'Erreur lors de la mise à jour du layout'
        );
      }

      const message =
        error.response?.data?.detail ||
        'Erreur lors de la mise à jour du layout';
      throw new Error(message);
    }
  },

  /**
   * Récupère les données de glucose en temps réel
   * @returns {Promise} Données de glucose
   */
  async getGlucoseData() {
    try {
      const summary = await this.getSummary(['glucose']);
      return summary.glucose;
    } catch (error) {
      console.error('dashboardService.getGlucoseData error:', error.message);
      throw error;
    }
  },

  /**
   * Récupère les alertes critiques
   * @returns {Promise} Liste des alertes
   */
  async getAlerts() {
    try {
      const summary = await this.getSummary(['alerts']);
      return summary.alerts || [];
    } catch (error) {
      console.error('dashboardService.getAlerts error:', error.message);
      throw error;
    }
  },

  /**
   * Récupère les données de médicaments
   * @returns {Promise} Données des médicaments
   */
  async getMedicationData() {
    try {
      const summary = await this.getSummary(['medication']);
      return summary.medication;
    } catch (error) {
      console.error('dashboardService.getMedicationData error:', error.message);
      throw error;
    }
  },

  /**
   * Récupère les données de nutrition
   * @returns {Promise} Données de nutrition
   */
  async getNutritionData() {
    try {
      const summary = await this.getSummary(['nutrition']);
      return summary.nutrition;
    } catch (error) {
      console.error('dashboardService.getNutritionData error:', error.message);
      throw error;
    }
  },

  /**
   * Récupère les données d'activité
   * @returns {Promise} Données d'activité
   */
  async getActivityData() {
    try {
      const summary = await this.getSummary(['activity']);
      return summary.activity;
    } catch (error) {
      console.error('dashboardService.getActivityData error:', error.message);
      throw error;
    }
  },

  /**
   * Récupère l'historique de glycémie
   * @param {Object} params - Paramètres de la requête
   * @param {string} params.start - Date de début (ISO 8601)
   * @param {string} params.end - Date de fin (ISO 8601)
   * @param {number} params.limit - Nombre max de résultats
   * @returns {Promise} Historique de glycémie
   */
  async getGlucoseHistory(params = {}) {
    try {
      const queryParams = new URLSearchParams();

      if (params.start) queryParams.append('start', params.start);
      if (params.end) queryParams.append('end', params.end);
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const url = `/v1/glucose/history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('dashboardService.getGlucoseHistory error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Erreur lors du chargement de l'historique";
      throw new Error(message);
    }
  },
};

export default dashboardService;
