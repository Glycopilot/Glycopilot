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
  id: number | string;
  type: 'high' | 'low' | 'warning' | 'info';
  message: string;
  severity: 'critical' | 'warning' | 'info';
  created_at: string;
  acknowledged?: boolean;
}

export interface DashboardMedicationData {
  taken_count: number;
  total_count: number;
  upcoming?: Array<{
    id: number | string;
    name: string;
    dosage: string;
    scheduled_at: string;
    taken?: boolean;
  }>;
  adherence?: {
    percentage: number;
    taken: number;
    missed: number;
  };
}

export interface DashboardNutritionData {
  today?: {
    calories: number;
    carbs: number;
    proteins: number;
    fats: number;
  };
  goals?: {
    calories: number;
    carbs: number;
    proteins: number;
    fats: number;
  };
}

export interface DashboardActivityData {
  today_count: number;
  today?: {
    steps: number;
    distance: number;
    calories_burned: number;
    active_minutes: number;
  };
  goals?: {
    steps: number;
    active_minutes: number;
  };
}

export interface DashboardSummary {
  glucose?: DashboardGlucoseData;
  alerts?: DashboardAlert[];
  medication?: DashboardMedicationData;
  nutrition?: DashboardNutritionData;
  activity?: DashboardActivityData;
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
