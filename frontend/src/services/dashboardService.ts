import apiClient from './apiClient';
import type {
  DashboardSummary,
  DashboardWidget,
  DashboardLayout,
  DashboardModule,
  GlucoseHistoryParams,
  DashboardGlucoseData,
  DashboardAlert,
  DashboardMedicationData,
  DashboardNutritionData,
  DashboardActivityData,
} from '../types/dashboard.types';
import { AxiosError } from 'axios';
import {
  mockDashboardSummary,
  mockWidgets,
  mockLayouts,
} from '../data/mockData';

interface ApiErrorResponse {
  error?: {
    message?: string;
    details?: Record<string, unknown>;
  };
  detail?: string;
}

// Service Dashboard
const dashboardService = {
  /**
   * Récupère le résumé complet du dashboard
   */
  async getSummary(
    modules: DashboardModule[] | null = null
  ): Promise<DashboardSummary> {
    try {
      let url = '/v1/dashboard/summary';

      if (modules && Array.isArray(modules) && modules.length > 0) {
        const params = modules.map(m => `include[]=${m}`).join('&');
        url += `?${params}`;
      }

      const response = await apiClient.get<DashboardSummary>(url);
      console.log('✅ Dashboard summary from API:', response.data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.warn('⚠️ dashboardService.getSummary error:', axiosError.message);

      // Retourner des données de démo si l'endpoint n'existe pas (404) ou autre erreur
      console.info(
        '📊 Utilisation des données de démonstration pour le résumé'
      );
      console.log('📦 Mock data:', mockDashboardSummary);
      return mockDashboardSummary;
    }
  },

  /**
   * Récupère la liste des widgets de l'utilisateur
   */
  async getWidgets(): Promise<DashboardWidget[]> {
    try {
      const response = await apiClient.get<{ widgets: DashboardWidget[] }>(
        '/v1/dashboard/widgets'
      );
      return response.data.widgets;
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.warn('dashboardService.getWidgets error:', axiosError.message);

      // Retourner des widgets de démo si l'endpoint n'existe pas
      console.info('📊 Utilisation des widgets de démonstration');
      return mockWidgets;
    }
  },

  /**
   * Récupère les layouts (positions et tailles) des widgets
   */
  async getWidgetLayouts(): Promise<DashboardLayout[]> {
    try {
      const response = await apiClient.get<{ layouts: DashboardLayout[] }>(
        '/v1/dashboard/widgets/layout'
      );
      return response.data.layouts;
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.warn(
        'dashboardService.getWidgetLayouts error:',
        axiosError.message
      );

      // Retourner des layouts de démo si l'endpoint n'existe pas
      console.info('📊 Utilisation des layouts de démonstration');
      return mockLayouts;
    }
  },

  /**
   * Met à jour la disposition des widgets
   */
  async updateWidgetLayout(
    layouts: DashboardLayout[]
  ): Promise<DashboardLayout[]> {
    try {
      const response = await apiClient.post<{ layouts: DashboardLayout[] }>(
        '/v1/dashboard/widgets/layouts',
        { layouts }
      );
      return response.data.layouts;
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.warn(
        'dashboardService.updateWidgetLayout error:',
        axiosError.message
      );
      return layouts; // Retourner les layouts d'origine en cas d'erreur
    }
  },

  /**
   * Récupère les données de glucose en temps réel
   */
  async getGlucoseData(): Promise<DashboardGlucoseData> {
    try {
      const summary = await this.getSummary(['glucose']);
      return (summary.glucose || {
        value: 0,
        recordedAt: new Date().toISOString(),
      }) as DashboardGlucoseData;
    } catch (error) {
      console.warn(
        'dashboardService.getGlucoseData error:',
        (error as Error).message
      );
      return {
        value: 0,
        recordedAt: new Date().toISOString(),
      } as DashboardGlucoseData;
    }
  },

  /**
   * Récupère les alertes récentes
   */
  async getAlerts(): Promise<DashboardAlert[]> {
    try {
      const summary = await this.getSummary(['alerts']);
      return summary.alerts || [];
    } catch (error) {
      console.warn(
        'dashboardService.getAlerts error:',
        (error as Error).message
      );
      return [];
    }
  },

  /**
   * Récupère les données de médicaments
   */
  async getMedicationData(): Promise<DashboardMedicationData> {
    try {
      const summary = await this.getSummary(['medication']);
      return (summary.medication || {
        taken_count: 0,
        total_count: 0,
      }) as DashboardMedicationData;
    } catch (error) {
      console.warn(
        'dashboardService.getMedicationData error:',
        (error as Error).message
      );
      return {
        taken_count: 0,
        total_count: 0,
      } as DashboardMedicationData;
    }
  },

  /**
   * Récupère les données nutritionnelles
   */
  async getNutritionData(): Promise<DashboardNutritionData> {
    try {
      const summary = await this.getSummary(['nutrition']);
      return summary.nutrition || {};
    } catch (error) {
      console.warn(
        'dashboardService.getNutritionData error:',
        (error as Error).message
      );
      return {};
    }
  },

  /**
   * Récupère les données d'activité
   */
  async getActivityData(): Promise<DashboardActivityData> {
    try {
      const summary = await this.getSummary(['activity']);
      return (summary.activity || {
        today_count: 0,
      }) as DashboardActivityData;
    } catch (error) {
      console.warn(
        'dashboardService.getActivityData error:',
        (error as Error).message
      );
      return {
        today_count: 0,
      } as DashboardActivityData;
    }
  },

  /**
   * Récupère l'historique de glycémie
   */
  async getGlucoseHistory(params: GlucoseHistoryParams = {}): Promise<unknown> {
    try {
      const queryParams = new URLSearchParams();

      if (params.start) queryParams.append('start', params.start);
      if (params.end) queryParams.append('end', params.end);
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const url = `/v1/glucose/history${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiErrorResponse>;
      console.warn(
        'dashboardService.getGlucoseHistory error:',
        axiosError.message
      );
      return [];
    }
  },
};

export default dashboardService;
