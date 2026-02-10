import apiClient from './apiClient';
import type {
  GlycemiaEntry,
  GlycemiaHistoryParams,
  GlycemiaPeriod,
  GlycemiaChartData,
} from '../types/glycemia.types';
import { AxiosError } from 'axios';

/**
 * Service pour gérer les données de glycémie
 */
const glycemiaService = {
  /**
   * Récupère la valeur actuelle de glycémie
   * Backend: GET /api/glycemia/current/
   */
  async getCurrent(): Promise<GlycemiaEntry | null> {
    try {
      const response = await apiClient.get<GlycemiaEntry>('/glycemia/current/');
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.warn('glycemiaService.getCurrent error:', axiosError.message);
      return null;
    }
  },

  /**
   * Récupère l'historique de glycémie
   * Backend: GET /api/glycemia/range/?days=X
   */
  async getHistory(
    params: GlycemiaHistoryParams = {}
  ): Promise<GlycemiaEntry[]> {
    try {
      // Calculer le nombre de jours selon la période
      let days = 7; // par défaut
      if (params.period === 'day') days = 1;
      else if (params.period === 'week') days = 7;
      else if (params.period === 'month') days = 30;

      const response = await apiClient.get<{
        entries: GlycemiaEntry[];
        stats: any;
        range_days: number;
      }>('/glycemia/range/', {
        params: { days },
      });

      // L'API retourne { entries: [...], stats: {...}, range_days: X }
      return response.data.entries || [];
    } catch (error) {
      const axiosError = error as AxiosError;
      console.warn('glycemiaService.getHistory error:', axiosError.message);
      return [];
    }
  },

  /**
   * Récupère l'historique pour aujourd'hui
   */
  async getTodayHistory(): Promise<GlycemiaEntry[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.getHistory({
      period: 'day',
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    });
  },

  /**
   * Récupère l'historique de la semaine
   */
  async getWeekHistory(): Promise<GlycemiaEntry[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    return await this.getHistory({
      period: 'week',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  },

  /**
   * Récupère l'historique du mois
   */
  async getMonthHistory(): Promise<GlycemiaEntry[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    return await this.getHistory({
      period: 'month',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  },

  /**
   * Crée une nouvelle mesure de glycémie manuelle
   * Backend: POST /api/glycemia/manual-readings/
   */
  async createManualReading(data: {
    measured_at: string;
    value: number;
    unit?: string;
    context?:
      | 'fasting'
      | 'preprandial'
      | 'postprandial_1h'
      | 'postprandial_2h'
      | 'bedtime'
      | 'exercise'
      | 'stress'
      | 'correction';
    notes?: string;
  }): Promise<GlycemiaEntry | null> {
    try {
      const response = await apiClient.post<GlycemiaEntry>(
        '/glycemia/manual-readings/',
        data
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(
        'glycemiaService.createManualReading error:',
        axiosError.message
      );
      return null;
    }
  },

  /**
   * Transforme les données du backend pour le chart
   */
  transformForChart(
    history: GlycemiaEntry[],
    period: GlycemiaPeriod = 'day'
  ): GlycemiaChartData {
    if (!history || history.length === 0) {
      return {
        labels: ['--'],
        datasets: [{ data: [100] }],
      };
    }

    // Trier par date
    const sorted = [...history].sort(
      (a, b) =>
        new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    );

    let labels: string[] = [];
    let data: number[] = [];

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
