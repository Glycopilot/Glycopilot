import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const normalizeApiUrl = (url: string): string => {
  const trimmedUrl = url.trim().replace(/\/+$/, '');

  if (!trimmedUrl) {
    return '';
  }

  return /\/api(\/|$)/.test(trimmedUrl) ? trimmedUrl : `${trimmedUrl}/api`;
};

const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || '');
const WS_URL = process.env.EXPO_PUBLIC_WS_URL || '';

const API_TIMEOUT = parseInt(
  process.env.EXPO_PUBLIC_API_TIMEOUT || '10000',
  10
);

const PUBLIC_AUTH_PATHS = [
  '/auth/register',
  '/auth/login',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/resend-verification',
];

const isPublicAuthPath = (url?: string): boolean => {
  if (!url) {
    return false;
  }

  return PUBLIC_AUTH_PATHS.some(path => url === path || url.startsWith(`${path}/`));
};

interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

// Créer une instance axios partagée
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
      if (token && config.headers && !isPublicAuthPath(config.url)) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Token retrieval failed
    }
    return config;
  },
  (error: AxiosError) => {
    throw error;
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

    const isAuthPath = originalRequest.url?.includes('/auth/');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthPath) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return apiClient(originalRequest);
          })
          .catch(err => { throw err; });
      }

      originalRequest._retry = true;
      isRefreshing = true;

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

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access}`;
        }
        processQueue(null, access);
        isRefreshing = false;
        return apiClient(originalRequest);
      } catch (refreshError) {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
        processQueue(refreshError, null);
        isRefreshing = false;
        throw refreshError;
      }
    }

    throw error;
  }
);

export default apiClient;
export { API_URL, WS_URL, API_TIMEOUT };
