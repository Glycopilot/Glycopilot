/**
 * Constantes de glycémie alignées avec le backend
 * Backend: apps/glycemia/signals.py et apps/dashboard/services/health_score_service.py
 */

// Seuils d'alerte (mg/dL)
export const GLYCEMIA_THRESHOLDS = {
  HYPO: 70, // < 70 = Hypoglycémie
  HYPER: 180, // > 180 = Hyperglycémie
} as const;

// Plage cible (mg/dL)
export const GLYCEMIA_TARGET = {
  MIN: 70,
  MAX: 180,
} as const;

// Unités
export const GLYCEMIA_UNITS = {
  MG_DL: 'mg/dL',
  MMOL_L: 'mmol/L',
} as const;

// Conversion mmol/L <-> mg/dL
export const GLYCEMIA_CONVERSION_FACTOR = 18.0182;

/**
 * Convertit mg/dL en mmol/L
 */
export function mgDlToMmolL(value: number): number {
  return Number((value / GLYCEMIA_CONVERSION_FACTOR).toFixed(1));
}

/**
 * Convertit mmol/L en mg/dL
 */
export function mmolLToMgDl(value: number): number {
  return Math.round(value * GLYCEMIA_CONVERSION_FACTOR);
}

/**
 * Détermine le statut de glycémie selon les seuils
 */
export function getGlycemiaStatus(value: number): 'hypo' | 'normal' | 'hyper' {
  if (value < GLYCEMIA_THRESHOLDS.HYPO) return 'hypo';
  if (value > GLYCEMIA_THRESHOLDS.HYPER) return 'hyper';
  return 'normal';
}

/**
 * Retourne un message formaté selon le statut
 */
export function getGlycemiaStatusLabel(value: number): string {
  const status = getGlycemiaStatus(value);
  switch (status) {
    case 'hypo':
      return 'Hypoglycémie';
    case 'hyper':
      return 'Hyperglycémie';
    case 'normal':
      return 'Normal';
  }
}

/**
 * Retourne une couleur selon le statut
 */
export function getGlycemiaStatusColor(value: number): {
  color: string;
  bgColor: string;
} {
  const status = getGlycemiaStatus(value);
  switch (status) {
    case 'hypo':
      return { color: '#DC2626', bgColor: '#FEE2E2' }; // Rouge
    case 'hyper':
      return { color: '#F59E0B', bgColor: '#FEF3C7' }; // Orange
    case 'normal':
      return { color: '#10B981', bgColor: '#D1FAE5' }; // Vert
  }
}
