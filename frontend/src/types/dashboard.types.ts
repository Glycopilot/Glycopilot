import type { GlycemiaStats } from './glycemia.types';

// Types pour le dashboard
export interface DashboardGlucoseData {
  value: number;
  recordedAt: string;
  unit?: string;
  trend?: 'rising' | 'falling' | 'flat';
  stats?: GlycemiaStats;
  recent?: Array<{
    value: number;
    measured_at: string;
  }>;
}

export interface DashboardAlert {
  alertId: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export interface DashboardMedicationData {
  taken_count: number;
  total_count: number;
  nextDose: {
    name: string;
    scheduledAt: string;
    status: string;
  } | null;
}

export interface DashboardNutritionData {
  calories: {
    consumed: number;
    goal: number;
  };
  carbs: {
    grams: number;
    goal: number;
  };
}

export interface DashboardActivityData {
  steps: {
    value: number;
    goal: number;
  };
  activeMinutes: number;
}

export interface DashboardSummary {
  glucose?: DashboardGlucoseData;
  alerts?: DashboardAlert[];
  medication?: DashboardMedicationData;
  nutrition?: DashboardNutritionData;
  activity?: DashboardActivityData;
  healthScore?: number;
  last_updated?: string;
}

export interface DashboardWidget {
  id: string;
  type:
    | 'glucose'
    | 'alerts'
    | 'medication'
    | 'nutrition'
    | 'activity'
    | 'chart';
  title: string;
  enabled: boolean;
  position?: number;
  config?: Record<string, unknown>;
}

export interface DashboardLayout {
  widget_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type DashboardModule =
  | 'glucose'
  | 'alerts'
  | 'medication'
  | 'nutrition'
  | 'activity';

export interface DashboardSummaryParams {
  modules?: DashboardModule[];
}

export interface GlucoseHistoryParams {
  start?: string;
  end?: string;
  limit?: number;
}
