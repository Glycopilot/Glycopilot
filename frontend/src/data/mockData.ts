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

  // Contextes réalistes selon l'heure de la journée
  const contexts: Array<
    | 'fasting'
    | 'preprandial'
    | 'postprandial_1h'
    | 'postprandial_2h'
    | 'bedtime'
    | 'exercise'
    | 'stress'
    | 'correction'
  > = [
    'fasting',
    'preprandial',
    'postprandial_2h',
    'bedtime',
    'exercise',
    'preprandial',
    'postprandial_1h',
    'fasting',
  ];

  for (let i = days * 4; i >= 0; i--) {
    const date = new Date(now);
    date.setHours(date.getHours() - i * 6); // Mesure toutes les 6h

    // Génère une valeur avec variation réaliste
    const randomValue = baseValue + (Math.random() - 0.5) * variation;
    const value = Math.round(Math.max(70, Math.min(180, randomValue)));

    // Sélectionner un contexte selon l'index
    const context = contexts[i % contexts.length];

    // Source variée (80% manuel, 20% CGM)
    const source = Math.random() > 0.8 ? 'cgm' : 'manual';

    data.push({
      id: `mock-${i}`,
      value,
      measured_at: date.toISOString(),
      context,
      source: source as 'manual' | 'cgm',
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
    nextDose: {
      name: 'Metformine 500mg',
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
    },
  },
  activity: {
    steps: {
      value: 5420,
      goal: 8000,
    },
    activeMinutes: 32,
  },
  nutrition: {
    calories: {
      consumed: 1450,
      goal: 1800,
    },
    carbs: {
      grams: 180,
      goal: 200,
    },
  },
  alerts: [
    {
      alertId: '1',
      type: 'hyper',
      severity: 'high',
    },
    {
      alertId: '2',
      type: 'medication',
      severity: 'medium',
    },
  ],
  healthScore: 75,
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
