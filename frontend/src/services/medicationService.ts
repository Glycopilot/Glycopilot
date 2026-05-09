import { AxiosError } from 'axios';

import apiClient from './apiClient';
import type {
  CreateUserMedicationPayload,
  IntakeActionPayload,
  MedicationIntake,
  ReferenceMedication,
  UserMedication,
} from '../types/medications.types';

type PaginatedResponse<T> = { results: T[] };

function valToString(val: unknown, fallback: string): string {
  if (Array.isArray(val)) return String(val[0]);
  if (typeof val === 'string') return val;
  return fallback;
}

function parseBackendError(data: unknown, fallback: string): string {
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length > 0) {
      const [field, val] = entries[0];
      const msg = valToString(val, fallback);
      return field === 'non_field_errors' ? msg : `${field}: ${msg}`;
    }
  }
  return fallback;
}

function extractListData<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data;
  const paged = data as PaginatedResponse<T>;
  return Array.isArray(paged.results) ? paged.results : [];
}

const medicationService = {
  /** Search local reference DB — returns full ReferenceMedication objects */
  async search(q: string): Promise<ReferenceMedication[]> {
    try {
      const response = await apiClient.get<ReferenceMedication[]>(
        '/medications/reference/',
        { params: { q } }
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn('medicationService.search error:', (error as AxiosError).message);
      return [];
    }
  },

  async list(): Promise<UserMedication[]> {
    try {
      const response = await apiClient.get<UserMedication[] | PaginatedResponse<UserMedication>>('/medications/log/');
      return extractListData(response.data);
    } catch (error) {
      console.warn('medicationService.list error:', (error as AxiosError).message);
      return [];
    }
  },

  async create(payload: CreateUserMedicationPayload): Promise<UserMedication> {
    try {
      const response = await apiClient.post<UserMedication>('/medications/log/', payload);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<Record<string, unknown>>;
      const data = axiosError.response?.data;
      const message = parseBackendError(data, "Impossible d'ajouter le médicament");
      console.warn('[medicationService.create] HTTP', axiosError.response?.status, JSON.stringify(data));
      throw new Error(message);
    }
  },

  async update(
    id: number,
    payload: Partial<CreateUserMedicationPayload>
  ): Promise<UserMedication | null> {
    try {
      const response = await apiClient.patch<UserMedication>(
        `/medications/log/${id}/`,
        payload
      );
      return response.data;
    } catch (error) {
      console.warn('medicationService.update error:', (error as AxiosError).message);
      return null;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      await apiClient.delete(`/medications/log/${id}/`);
      return true;
    } catch (error) {
      console.warn('medicationService.delete error:', (error as AxiosError).message);
      return false;
    }
  },

  async deactivate(id: number): Promise<boolean> {
    try {
      await apiClient.patch(`/medications/log/${id}/`, { statut: false });
      return true;
    } catch (error) {
      console.warn('medicationService.deactivate error:', (error as AxiosError).message);
      return false;
    }
  },

  async getToday(): Promise<MedicationIntake[]> {
    try {
      const response = await apiClient.get<MedicationIntake[]>(
        '/medications/log/today/'
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn('medicationService.getToday error:', (error as AxiosError).message);
      return [];
    }
  },

  async markIntake(
    intakeId: number,
    payload: IntakeActionPayload
  ): Promise<MedicationIntake | null> {
    try {
      const response = await apiClient.post<MedicationIntake>(
        `/medications/intakes/${intakeId}/action/`,
        payload
      );
      return response.data;
    } catch (error) {
      console.warn('medicationService.markIntake error:', (error as AxiosError).message);
      return null;
    }
  },

  async getIntakeHistory(medicationId?: number): Promise<MedicationIntake[]> {
    try {
      const params = medicationId ? { medication_id: medicationId } : undefined;
      const response = await apiClient.get<MedicationIntake[]>(
        '/medications/intakes/history/',
        { params }
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn(
        'medicationService.getIntakeHistory error:',
        (error as AxiosError).message
      );
      return [];
    }
  },
};

export default medicationService;
