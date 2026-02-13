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
import {
  mockDashboardSummary,
  mockWidgets,
  mockLayouts,
} from '../data/mockData';


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
      return response.data;
    } catch {
      // Retourner des données de démo si l'endpoint n'existe pas (404) ou autre erreur
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
    } catch {
      // Retourner des widgets de démo si l'endpoint n'existe pas
      return mockWidgets;
    }
  },

  /**
   * Récupère les layouts (positions et tailles) des widgets
   */
  async getWidgetLayouts(): Promise<DashboardLayout[]> {
    try {
      const response = await apiClient.get<{ layout: DashboardLayout[] }>(
        '/v1/dashboard/widgets/layout'
      );
      return response.data.layout || [];
    } catch {
      // Retourner des layouts de démo si l'endpoint n'existe pas
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
      const response = await apiClient.patch<{ layout: DashboardLayout[]; updatedAt: string }>(
        '/v1/dashboard/widgets/layout',
        { layout: layouts }
      );
      return response.data.layout;
    } catch {
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
    } catch {
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
    } catch {
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
        nextDose: null,
      }) as DashboardMedicationData;
    } catch {
      return {
        taken_count: 0,
        total_count: 0,
        nextDose: null,
      } as DashboardMedicationData;
    }
  },

  /**
   * Récupère les données nutritionnelles
   */
  async getNutritionData(): Promise<DashboardNutritionData> {
    try {
      const summary = await this.getSummary(['nutrition']);
      return (summary.nutrition || {
        calories: { consumed: 0, goal: 1800 },
        carbs: { grams: 0, goal: 200 },
      }) as DashboardNutritionData;
    } catch {
      return {
        calories: { consumed: 0, goal: 1800 },
        carbs: { grams: 0, goal: 200 },
      } as DashboardNutritionData;
    }
  },

  /**
   * Récupère les données d'activité
   */
  async getActivityData(): Promise<DashboardActivityData> {
    try {
      const summary = await this.getSummary(['activity']);
      return (summary.activity || {
        steps: { value: 0, goal: 8000 },
        activeMinutes: 0,
      }) as DashboardActivityData;
    } catch {
      return {
        steps: { value: 0, goal: 8000 },
        activeMinutes: 0,
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
    } catch {
      return [];
    }
  },
};

export default dashboardService;
