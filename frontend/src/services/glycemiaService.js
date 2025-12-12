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

/**
 * Service pour gérer les données de glycémie
 */
const glycemiaService = {
  /**
   * Récupère l'historique de glycémie
   * @param {Object} params - Paramètres de la requête
   * @param {string} params.period - Période: 'day', 'week', 'month'
   * @param {string} params.startDate - Date de début (ISO format)
   * @param {string} params.endDate - Date de fin (ISO format)
   * @returns {Promise} Historique de glycémie
   */
  async getHistory(params = {}) {
    try {
      const response = await apiClient.get('/v1/glucose/history/', { params });
      // L'API retourne { entries: [...], stats: {...}, next_cursor: ... }
      return response.data.entries || [];
    } catch (error) {
      console.error('glycemiaService.getHistory error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw error;
    }
  },

  /**
   * Récupère l'historique pour aujourd'hui
   * @returns {Promise} Historique d'aujourd'hui
   */
  async getTodayHistory() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getHistory({
      period: 'day',
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    });
  },

  /**
   * Récupère l'historique de la semaine
   * @returns {Promise} Historique de la semaine
   */
  async getWeekHistory() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    return this.getHistory({
      period: 'week',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  },

  /**
   * Récupère l'historique du mois
   * @returns {Promise} Historique du mois
   */
  async getMonthHistory() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    return this.getHistory({
      period: 'month',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  },

  /**
   * Transforme les données du backend pour le chart
   * @param {Array} history - Données brutes du backend
   * @param {string} period - Période sélectionnée
   * @returns {Object} Données formatées pour LineChart
   */
  transformForChart(history, period = 'day') {
    if (!history || history.length === 0) {
      return {
        labels: ['--'],
        datasets: [{ data: [100] }],
      };
    }

    // Trier par date
    const sorted = [...history].sort(
      (a, b) => new Date(a.measured_at) - new Date(b.measured_at)
    );

    let labels = [];
    let data = [];

    if (period === 'day') {
      // Grouper par heure pour aujourd'hui
      sorted.forEach(item => {
        const date = new Date(item.measured_at);
        const hour = date.getHours();
        const label = `${hour}h`;
        labels.push(label);
        data.push(item.value);
      });
    } else if (period === 'week') {
      // Échantillonner 7 points pour la semaine
      const step = Math.max(1, Math.floor(sorted.length / 7));
      for (let i = 0; i < sorted.length; i += step) {
        const item = sorted[i];
        const date = new Date(item.measured_at);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        labels.push(label);
        data.push(item.value);
      }
    } else if (period === 'month') {
      // Échantillonner 10 points pour le mois
      const step = Math.max(1, Math.floor(sorted.length / 10));
      for (let i = 0; i < sorted.length; i += step) {
        const item = sorted[i];
        const date = new Date(item.measured_at);
        const label = `${date.getDate()}/${date.getMonth() + 1}`;
        labels.push(label);
        data.push(item.value);
      }
    }

    // Limiter à 10 points max pour la lisibilité
    if (labels.length > 10) {
      const step = Math.ceil(labels.length / 10);
      labels = labels.filter((_, i) => i % step === 0);
      data = data.filter((_, i) => i % step === 0);
    }

    return {
      labels,
      datasets: [
        {
          data,
          strokeWidth: 3,
        },
      ],
    };
  },
};

export default glycemiaService;
