// Types pour les données de glycémie
export interface GlycemiaEntry {
  id: number | string;
  value: number;
  measured_at: string;
  notes?: string;
  tags?: string[];
  context?: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'other';
}

export interface GlycemiaStats {
  average: number;
  min: number;
  max: number;
  count: number;
  in_range: number;
  above_range: number;
  below_range: number;
}

export interface GlycemiaHistory {
  entries: GlycemiaEntry[];
  stats?: GlycemiaStats;
  next_cursor?: string | null;
}

export interface GlycemiaChartData {
  labels: string[];
  datasets: Array<{
    data: number[];
    strokeWidth?: number;
    color?: (opacity: number) => string;
  }>;
}

export type GlycemiaPeriod = 'day' | 'week' | 'month';

export interface GlycemiaHistoryParams {
  period?: GlycemiaPeriod;
  startDate?: string;
  endDate?: string;
  limit?: number;
}
