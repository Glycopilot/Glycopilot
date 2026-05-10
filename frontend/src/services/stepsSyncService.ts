import apiClient from './apiClient';

export interface DailyStepsState {
  day: string;
  reported_steps_today: number;
  total_milestone_points: number;
  step_block: number;
  points_per_block: number;
}

export interface DailyStepsSyncResponse {
  steps: number;
  day: string;
  points_earned: number;
  milestones_crossed: number;
  total_milestone_points: number;
}

export async function fetchDailyStepsState(): Promise<DailyStepsState> {
  const { data } = await apiClient.get<DailyStepsState>(
    'activities/steps/state/'
  );
  return data;
}

export async function syncDailySteps(
  steps: number,
  day?: string
): Promise<DailyStepsSyncResponse> {
  const body: { steps: number; day?: string } = { steps };
  if (day) {
    body.day = day;
  }
  const { data } = await apiClient.post<DailyStepsSyncResponse>(
    'activities/steps/sync/',
    body
  );
  return data;
}
