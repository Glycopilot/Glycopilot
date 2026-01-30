/**
 * Données de démonstration pour l'application
 * Utilisées quand l'API n'est pas disponible
 */

import type {
  DashboardSummary,
  DashboardWidget,
  DashboardLayout,
} from '../types/dashboard.types';
import type { GlycemiaEntry } from '../types/glycemia.types';

/**
 * Génère des données de glycémie pour une période donnée
 */
export const generateMockGlycemiaData = (days: number): GlycemiaEntry[] => {
  const data: GlycemiaEntry[] = [];
  const now = new Date();

  // Valeurs réalistes de glycémie (mg/dL)
  const baseValue = 110;
  const variation = 40;

  for (let i = days * 4; i >= 0; i--) {
    const date = new Date(now);
    date.setHours(date.getHours() - i * 6); // Mesure toutes les 6h

    // Génère une valeur avec variation réaliste
    const randomValue = baseValue + (Math.random() - 0.5) * variation;
    const value = Math.round(Math.max(70, Math.min(180, randomValue)));

    data.push({
      id: `mock-${i}`,
      value,
      measured_at: date.toISOString(),
      notes: i % 5 === 0 ? 'Mesure de démo' : undefined,
    });
  }

  return data.reverse();
};

/**
 * Résumé du dashboard (mock)
 */
export const mockDashboardSummary: DashboardSummary = {
  glucose: {
    value: 125,
    recordedAt: new Date().toISOString(),
    unit: 'mg/dL',
    trend: 'flat',
  },
  medication: {
    taken_count: 2,
    total_count: 3,
  },
  activity: {
    today_count: 3,
  },
  nutrition: {
    today: {
      calories: 1450,
      carbs: 180,
      proteins: 85,
      fats: 50,
    },
  },
  alerts: [
    {
      id: 1,
      type: 'high',
      message: 'Glycémie légèrement élevée (135 mg/dL)',
      severity: 'warning',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Il y a 2h
    },
    {
      id: 2,
      type: 'info',
      message: "N'oubliez pas votre médicament de 14h",
      severity: 'info',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // Il y a 30min
    },
  ],
};

/**
 * Widgets disponibles (mock)
 */
export const mockWidgets: DashboardWidget[] = [
  {
    id: 'glucose-card',
    title: 'Glycémie',
    type: 'glucose',
    enabled: true,
    position: 1,
  },
  {
    id: 'medication-card',
    title: 'Médicaments',
    type: 'medication',
    enabled: true,
    position: 2,
  },
  {
    id: 'activity-card',
    title: 'Activité',
    type: 'activity',
    enabled: true,
    position: 3,
  },
  {
    id: 'glucose-chart',
    title: 'Graphique Glycémie',
    type: 'chart',
    enabled: true,
    position: 4,
  },
];

/**
 * Layouts des widgets (mock)
 */
export const mockLayouts: DashboardLayout[] = [
  {
    widget_id: 'glucose-card',
    x: 0,
    y: 0,
    width: 2,
    height: 2,
  },
  {
    widget_id: 'medication-card',
    x: 2,
    y: 0,
    width: 2,
    height: 1,
  },
  {
    widget_id: 'activity-card',
    x: 2,
    y: 1,
    width: 2,
    height: 1,
  },
  {
    widget_id: 'glucose-chart',
    x: 0,
    y: 2,
    width: 4,
    height: 2,
  },
];
