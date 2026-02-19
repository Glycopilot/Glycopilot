import apiClient from './apiClient';
import type { AlertEvent } from '../types/alert.types';
import { AxiosError } from 'axios';

const alertService = {
  async getHistory(): Promise<AlertEvent[]> {
    try {
      const response = await apiClient.get<{ results: AlertEvent[] }>('/alerts/events/');
      return response.data.results ?? [];
    } catch (error) {
      const axiosError = error as AxiosError;
      console.warn('alertService.getHistory error:', axiosError.message);
      return [];
    }
  },

  async ackAlert(eventId: number): Promise<boolean> {
    try {
      await apiClient.post('/alerts/events/ack/', { event_id: eventId });
      return true;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.warn('alertService.ackAlert error:', axiosError.message);
      return false;
    }
  },
};

export default alertService;
