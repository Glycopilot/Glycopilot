export interface LinkedPatient {
  patient_user_id: string;
  first_name: string;
  last_name: string;
  diabetes_type: string | null;
  relation_type: string;
  last_location: {
    lat: number;
    lng: number;
    measuredAt: string;
  } | null;
}

export interface ProcheAlert {
  alertId: string;
  type: string;
  severity: string;
  triggeredAt: string;
  message?: string;
}

export interface ProcheGlycemiaEntry {
  value: number;
  unit: string;
  trend: string | null;
  rate: number | null;
  context: string | null;
  measuredAt: string;
  source: string;
  notes: string | null;
  photo: string | null;
  location: { lat: number; lng: number } | null;
}

export interface ProcheDashboardGlucose {
  value: number;
  unit: string;
  trend: string | null;
  recordedAt: string;
}

export interface ProcheDashboard {
  glucose: ProcheDashboardGlucose | null;
  alerts: Array<{
    alertId: string;
    type: string;
    severity: string;
    triggeredAt: string;
  }>;
  medication: {
    nextDose: {
      name: string;
      dosage: string;
      status: string;
    } | null;
  } | null;
  healthScore: number | null;
}
