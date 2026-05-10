import apiClient from './apiClient';

export interface ActivityTypeDto {
  activity_id: number;
  name: string;
  recommended_duration: number | null;
  calories_burned: number | null;
  sugar_used: number | null;
  link_photo: string | null;
}

export interface UserActivityDto {
  id: number;
  user: string;
  activity: number;
  activity_details: ActivityTypeDto;
  start: string;
  end: string;
  duration_minutes: number;
  intensity: string;
  total_calories_burned: number;
  total_sugar_used: number;
}

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const acc: T[] = [];
  let page = 1;
  for (;;) {
    const { data } = await apiClient.get<unknown>(path, { params: { page } });
    if (Array.isArray(data)) {
      return data as T[];
    }
    const p = data as Paginated<T>;
    if (!p.results) {
      return acc;
    }
    acc.push(...p.results);
    if (!p.next) {
      break;
    }
    page += 1;
  }
  return acc;
}

export async function fetchActivityTypes(): Promise<ActivityTypeDto[]> {
  const list = await fetchAllPages<ActivityTypeDto>('activities/types/');
  return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function fetchUserActivityHistory(): Promise<UserActivityDto[]> {
  return fetchAllPages<UserActivityDto>('activities/history/');
}

export interface CreateUserActivityPayload {
  activity: number;
  start: string;
  duration_minutes: number;
  intensity?: string;
}

export async function createUserActivity(
  payload: CreateUserActivityPayload
): Promise<UserActivityDto> {
  const { data } = await apiClient.post<UserActivityDto>(
    'activities/history/',
    payload
  );
  return data;
}
