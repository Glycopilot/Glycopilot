import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8006/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface DexcomAuthorizeResponse {
  authorize_url: string;
}

const dexcomService = {
  async getAuthorizeUrl(): Promise<string> {
    const res = await apiClient.get<DexcomAuthorizeResponse>('/integrations/dexcom/start');
    return res.data.authorize_url;
  },
};

export default dexcomService;