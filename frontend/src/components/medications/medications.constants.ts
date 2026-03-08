import type { MealTiming, MedicationIntake } from '../../types/medications.types';

export const MEAL_TIMING_LABELS: Record<MealTiming, string> = {
  before_meal: 'Avant repas',
  after_meal: 'Après repas',
  anytime: 'Indifférent',
};

export const MEAL_TIMING_OPTIONS: { value: MealTiming; label: string }[] = [
  { value: 'before_meal', label: 'Avant repas' },
  { value: 'after_meal', label: 'Après repas' },
  { value: 'anytime', label: 'Indifférent' },
];

export function getIntakeColor(status: MedicationIntake['status']): string {
  switch (status) {
    case 'taken':   return '#10B981';
    case 'missed':  return '#EF4444';
    case 'snoozed': return '#F59E0B';
    default:        return '#007AFF';
  }
}

export function getIntakeLabel(status: MedicationIntake['status']): string {
  switch (status) {
    case 'taken':   return 'Pris';
    case 'missed':  return 'Manqué';
    case 'snoozed': return 'Reporté';
    default:        return 'À prendre';
  }
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}
