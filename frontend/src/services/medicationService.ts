import { AxiosError } from 'axios';

import apiClient from './apiClient';
import type {
  CreateUserMedicationPayload,
  IntakeActionPayload,
  MedicationIntake,
  ReferenceMedication,
  UserMedication,
} from '../types/medications.types';

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
      const response = await apiClient.get<UserMedication[] | { results: UserMedication[] }>('/medications/log/');
      if (Array.isArray(response.data)) return response.data;
      if (response.data && Array.isArray((response.data as { results: UserMedication[] }).results)) {
        return (response.data as { results: UserMedication[] }).results;
      }
      return [];
    } catch (error) {
      console.warn('medicationService.list error:', (error as AxiosError).message);
      return [];
    }
  },

  async create(payload: CreateUserMedicationPayload): Promise<UserMedication | null> {
    try {
      const response = await apiClient.post<UserMedication>('/medications/log/', payload);
      return response.data;
    } catch (error) {
      console.warn('medicationService.create error:', (error as AxiosError).message);
      return null;
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
