import { AxiosError } from 'axios';
import apiClient from './apiClient';

export interface ReferenceActivity {
  activity_id: number;
  name: string;
  recommended_duration: number | null;
  calories_burned: number | null;
  sugar_used: number | null;
  link_photo: string | null;
}

export interface UserActivity {
  id: number;
  activity: number;
  activity_details: ReferenceActivity;
  start: string;
  end: string;
  duration_minutes: number;
  intensity: string;
  steps: number | null;
  total_calories_burned: number;
  total_sugar_used: number;
}

export interface CreateUserActivityPayload {
  activity: number;
  start: string;
  duration_minutes: number;
  intensity?: string;
  steps?: number;
}

const activityService = {
  async getReferenceActivities(): Promise<ReferenceActivity[]> {
    try {
      const response = await apiClient.get<ReferenceActivity[]>('/activities/reference/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn('activityService.getReferenceActivities error:', (error as AxiosError).message);
      return [];
    }
  },

  async getUserActivities(): Promise<UserActivity[]> {
    try {
      const response = await apiClient.get<UserActivity[]>('/activities/log/');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn('activityService.getUserActivities error:', (error as AxiosError).message);
      return [];
    }
  },

  async logActivity(payload: CreateUserActivityPayload): Promise<UserActivity> {
    const response = await apiClient.post<UserActivity>('/activities/log/', payload);
    return response.data;
  },

  async deleteActivity(id: number): Promise<void> {
    await apiClient.delete(`/activities/log/${id}/`);
  },
};

export default activityService;
