import apiClient from './apiClient';
import type {
  GlycemiaEntry,
  GlycemiaHistory,
  GlycemiaHistoryParams,
  GlycemiaPeriod,
  GlycemiaChartData,
} from '../types/glycemia.types';
import { AxiosError } from 'axios';
import { generateMockGlycemiaData } from '../data/mockData';

/**
 * Service pour gérer les données de glycémie
 */
const glycemiaService = {
  /**
   * Récupère l'historique de glycémie
   */
  async getHistory(
    params: GlycemiaHistoryParams = {}
  ): Promise<GlycemiaEntry[]> {
    try {
      const response = await apiClient.get<GlycemiaHistory>(
        '/v1/glucose/history/',
        { params }
      );
      // L'API retourne { entries: [...], stats: {...}, next_cursor: ... }
      return response.data.entries || [];
    } catch (error) {
      const axiosError = error as AxiosError;
      console.warn('glycemiaService.getHistory error:', axiosError.message);

      // Retourner un tableau vide si l'endpoint n'existe pas
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

    const result = await this.getHistory({
      period: 'day',
      startDate: today.toISOString(),
      endDate: tomorrow.toISOString(),
    });

    // Si pas de données, retourner des données de démo pour 1 jour
    if (result.length === 0) {
      console.info('📊 Utilisation des données de glycémie de démo (1 jour)');
      return generateMockGlycemiaData(1);
    }
    return result;
  },

  /**
   * Récupère l'historique de la semaine
   */
  async getWeekHistory(): Promise<GlycemiaEntry[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);

    const result = await this.getHistory({
      period: 'week',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    // Si pas de données, retourner des données de démo pour 7 jours
    if (result.length === 0) {
      console.info('📊 Utilisation des données de glycémie de démo (7 jours)');
      return generateMockGlycemiaData(7);
    }
    return result;
  },

  /**
   * Récupère l'historique du mois
   */
  async getMonthHistory(): Promise<GlycemiaEntry[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const result = await this.getHistory({
      period: 'month',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    // Si pas de données, retourner des données de démo pour 30 jours
    if (result.length === 0) {
      console.info('📊 Utilisation des données de glycémie de démo (30 jours)');
      return generateMockGlycemiaData(30);
    }
    return result;
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
