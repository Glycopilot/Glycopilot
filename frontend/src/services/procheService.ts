import apiClient from './apiClient';
import type { LinkedPatient, ProcheGlycemiaEntry, ProcheDashboard, ProcheAlert } from '../types/proche.types';

const procheService = {
  async validateCode(email: string, code: string): Promise<void> {
    await apiClient.post('/doctors/care-team/validate-proche-code/', { email, code });
  },

  async activateAccount(email: string, code: string, password: string): Promise<void> {
    await apiClient.post('/doctors/care-team/activate-proche/', { email, code, password });
  },

  async getLinkedPatient(): Promise<LinkedPatient | null> {
    try {
      const res = await apiClient.get<LinkedPatient>('/doctors/care-team/my-linked-patient/');
      return res.data;
    } catch {
      return null;
    }
  },

  async getGlycemia(): Promise<ProcheGlycemiaEntry[]> {
    try {
      const res = await apiClient.get<ProcheGlycemiaEntry[]>('/doctors/care-team/proche-glycemia/');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getDashboard(): Promise<ProcheDashboard | null> {
    try {
      const res = await apiClient.get<ProcheDashboard>('/doctors/care-team/proche-dashboard/');
      return res.data;
    } catch {
      return null;
    }
  },

  async getAlerts(): Promise<ProcheAlert[]> {
    try {
      const res = await apiClient.get<ProcheAlert[]>('/doctors/care-team/proche-alerts/');
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },
};

export default procheService;
