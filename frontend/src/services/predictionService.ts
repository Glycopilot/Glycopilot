import apiClient from './apiClient';

export interface GlycemiaPrediction {
  id: string;
  for_time: string;
  created_at: string;
  model_version: string;
  source: 'baseline' | 'lstm' | 'transformer' | 'ensemble';
  status: 'ok' | 'low_confidence' | 'insufficient_data' | 'error';
  confidence: number | null;
  input_readings_count: number;
  y_hat_15: number | null;
  p10_15: number | null;
  p90_15: number | null;
  risk_hypo_15: number | null;
  risk_hyper_15: number | null;
  y_hat_30: number | null;
  p10_30: number | null;
  p90_30: number | null;
  risk_hypo_30: number | null;
  risk_hyper_30: number | null;
  y_hat_60: number | null;
  p10_60: number | null;
  p90_60: number | null;
  risk_hypo_60: number | null;
  risk_hyper_60: number | null;
  recommendation: string | null;
}

const predictionService = {
  async getLatest(): Promise<GlycemiaPrediction | null> {
    try {
      const response = await apiClient.get<GlycemiaPrediction>(
        '/glycemia/predictions/latest/'
      );
      return response.data;
    } catch {
      return null;
    }
  },

  async getHistory(limit = 5): Promise<GlycemiaPrediction[]> {
    try {
      const response = await apiClient.get<
        { results: GlycemiaPrediction[] } | GlycemiaPrediction[]
      >('/glycemia/predictions/', { params: { limit, status: 'ok' } });
      const data = response.data;
      return Array.isArray(data) ? data : data.results ?? [];
    } catch {
      return [];
    }
  },
};

export default predictionService;
