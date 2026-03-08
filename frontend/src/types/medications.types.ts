export interface ReferenceMedication {
  medication_id: number;
  name: string;
  type: string | null;
  dosage: string | null;
  form: string | null;
  route: string | null;
  cis_code: string | null;
  interval_h: number | null;
  max_duration_d: number | null;
}

/** Result from OpenFDA autocomplete */
export interface FdaMedicationResult {
  brandName: string;
  genericName: string;
}

export type MealTiming = 'before_meal' | 'after_meal' | 'anytime';
export type MedicationSource = 'api' | 'manual' | 'prescribed';
export type IntakeStatus = 'pending' | 'taken' | 'missed' | 'snoozed';

export interface MedicationSchedule {
  id: number;
  user_medication: number;
  time: string; // "08:00"
  reminder_enabled: boolean;
}

export interface UserMedication {
  id: number;
  user: number;
  medication: ReferenceMedication | null;
  custom_name: string | null;
  custom_dosage: string | null;
  display_name: string;
  display_dosage: string | null;
  start_date: string;
  end_date: string | null;
  doses_per_day: number;
  meal_timing: MealTiming;
  source: MedicationSource;
  statut: boolean;
  schedules: MedicationSchedule[];
  created_at: string;
  updated_at: string;
}

export interface MedicationIntake {
  id: number;
  user_medication: number;
  schedule: number | null;
  scheduled_date: string;
  scheduled_time: string;
  status: IntakeStatus;
  taken_at: string | null;
  snoozed_until: string | null;
  created_at: string;
  updated_at: string;
  // Extra fields from TodayIntakeSerializer
  medication_name?: string;
  medication_dosage?: string | null;
  meal_timing?: MealTiming;
  reminder_enabled?: boolean;
}

export interface CreateUserMedicationPayload {
  medication_id?: number;
  custom_name?: string;
  custom_dosage?: string;
  start_date: string;
  end_date?: string;
  doses_per_day: number;
  meal_timing: MealTiming;
  source: MedicationSource;
  statut?: boolean;
  schedule_times: string[];
  reminder_enabled?: boolean;
}

export interface IntakeActionPayload {
  action: 'taken' | 'missed' | 'snoozed';
  snoozed_until?: string;
  taken_at?: string;
}

export interface BdpmMedication {
  cis_code: string | null;
  name: string;
  dosage: string | null;
  type: string | null;
}

export interface MedicationSearchResult {
  local: ReferenceMedication[];
  bdpm: BdpmMedication[];
}
