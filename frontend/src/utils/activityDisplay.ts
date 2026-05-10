import type { UserActivityDto } from '../services/activitiesApiService';

const ACCENTS: { test: RegExp; emoji: string; color: string }[] = [
  { test: /marche|randonnée/i, emoji: '🚶', color: '#3B82F6' },
  { test: /course|trail|running/i, emoji: '🏃', color: '#10B981' },
  { test: /vélo|spinning/i, emoji: '🚴', color: '#A855F7' },
  { test: /natation|aquagym/i, emoji: '🏊', color: '#06B6D4' },
  { test: /yoga|pilates|tai/i, emoji: '🧘', color: '#EC4899' },
  { test: /musculation|crossfit|body pump/i, emoji: '🏋️', color: '#F97316' },
  { test: /zumba|danse|aérobic/i, emoji: '💃', color: '#DB2777' },
  { test: /boxe/i, emoji: '🥊', color: '#DC2626' },
];

export function activityVisual(name: string): { emoji: string; color: string } {
  const hit = ACCENTS.find(a => a.test.test(name));
  return hit ? { emoji: hit.emoji, color: hit.color } : { emoji: '⚡', color: '#64748B' };
}

export function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, now)) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (sameDay(d, y)) {
    return `Hier ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return d.toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function startOfWeekMonday(ref: Date = new Date()): Date {
  const d = new Date(ref);
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function glycemicEstimateFromSession(
  caloriesBurned: number,
  sugarUsed?: number
): number {
  if (sugarUsed != null && sugarUsed > 0) {
    return Math.max(1, Math.round(sugarUsed * 12));
  }
  if (caloriesBurned > 0) {
    return Math.max(1, Math.round(caloriesBurned / 25));
  }
  return 0;
}

export function sumThisCalendarWeek(
  history: UserActivityDto[],
  now: Date = new Date()
): { minutes: number; calories: number; sessions: number } {
  const ws = startOfWeekMonday(now);
  let minutes = 0;
  let calories = 0;
  let sessions = 0;
  for (const h of history) {
    const t = new Date(h.start);
    if (t >= ws && t <= now) {
      minutes += h.duration_minutes;
      calories += h.total_calories_burned;
      sessions += 1;
    }
  }
  return { minutes, calories, sessions };
}

export function sumPreviousCalendarWeek(
  history: UserActivityDto[],
  now: Date = new Date()
): { minutes: number; calories: number; sessions: number } {
  const thisMonday = startOfWeekMonday(now);
  const prevMonday = new Date(thisMonday);
  prevMonday.setDate(prevMonday.getDate() - 7);
  const prevSunday = new Date(thisMonday);
  prevSunday.setMilliseconds(-1);

  let minutes = 0;
  let calories = 0;
  let sessions = 0;
  for (const h of history) {
    const t = new Date(h.start);
    if (t >= prevMonday && t <= prevSunday) {
      minutes += h.duration_minutes;
      calories += h.total_calories_burned;
      sessions += 1;
    }
  }
  return { minutes, calories, sessions };
}

export function formatWeekTrend(currentMin: number, previousMin: number): string {
  if (previousMin <= 0 && currentMin <= 0) {
    return '—';
  }
  if (previousMin <= 0) {
    return '↑';
  }
  const pct = Math.round(((currentMin - previousMin) / previousMin) * 100);
  if (pct === 0) {
    return '=';
  }
  return `${pct > 0 ? '+' : ''}${pct}%`;
}
