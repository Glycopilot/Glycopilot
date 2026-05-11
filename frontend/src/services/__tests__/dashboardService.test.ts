process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';

import MockAdapter from 'axios-mock-adapter';
import dashboardService from '../dashboardService';
import apiClient from '../apiClient';

const mock = new MockAdapter(apiClient);

beforeEach(() => mock.reset());
afterAll(() => mock.restore());

const mockSummary = {
  glucose: { value: 5.5, recordedAt: '2024-01-01T10:00:00Z' },
  alerts: [{ id: 1, message: 'High glucose' }],
  medication: { taken_count: 2, total_count: 3, nextDose: null },
  nutrition: { calories: { consumed: 1200, goal: 1800 }, carbs: { grams: 150, goal: 200 } },
  activity: { steps: { value: 5000, goal: 8000 }, activeMinutes: 30 },
};

describe('dashboardService.getSummary', () => {
  it('returns summary without modules', async () => {
    mock.onGet('/v1/dashboard/summary').reply(200, mockSummary);
    const result = await dashboardService.getSummary();
    expect(result).toEqual(mockSummary);
  });

  it('returns summary with modules', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, mockSummary);
    const result = await dashboardService.getSummary(['glucose', 'alerts'] as any[]);
    expect(result).toEqual(mockSummary);
  });

  it('returns mock data on error', async () => {
    mock.onGet('/v1/dashboard/summary').reply(500);
    const result = await dashboardService.getSummary();
    expect(result).toBeDefined();
  });
});

describe('dashboardService.getWidgets', () => {
  it('returns widgets on success', async () => {
    const widgets = [{ id: 'w1', type: 'glucose' }];
    mock.onGet('/v1/dashboard/widgets').reply(200, { widgets });
    const result = await dashboardService.getWidgets();
    expect(result).toEqual(widgets);
  });

  it('returns mock widgets on error', async () => {
    mock.onGet('/v1/dashboard/widgets').reply(500);
    const result = await dashboardService.getWidgets();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('dashboardService.getWidgetLayouts', () => {
  it('returns layout on success', async () => {
    const layout = [{ id: 'l1', x: 0, y: 0, w: 2, h: 1 }];
    mock.onGet('/v1/dashboard/widgets/layout').reply(200, { layout });
    const result = await dashboardService.getWidgetLayouts();
    expect(result).toEqual(layout);
  });

  it('returns empty array when layout missing', async () => {
    mock.onGet('/v1/dashboard/widgets/layout').reply(200, {});
    const result = await dashboardService.getWidgetLayouts();
    expect(result).toEqual([]);
  });

  it('returns mock layouts on error', async () => {
    mock.onGet('/v1/dashboard/widgets/layout').reply(500);
    const result = await dashboardService.getWidgetLayouts();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('dashboardService.updateWidgetLayout', () => {
  const layouts = [{ id: 'l1', x: 0, y: 0, w: 2, h: 1 }] as any[];

  it('returns updated layout on success', async () => {
    mock.onPatch('/v1/dashboard/widgets/layout').reply(200, { layout: layouts, updatedAt: '2024-01-01' });
    const result = await dashboardService.updateWidgetLayout(layouts);
    expect(result).toEqual(layouts);
  });

  it('returns original layouts on error', async () => {
    mock.onPatch('/v1/dashboard/widgets/layout').reply(500);
    const result = await dashboardService.updateWidgetLayout(layouts);
    expect(result).toEqual(layouts);
  });
});

describe('dashboardService.getGlucoseData', () => {
  it('returns glucose data from summary', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, mockSummary);
    const result = await dashboardService.getGlucoseData();
    expect(result.value).toBe(5.5);
  });

  it('returns default when glucose missing', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, { ...mockSummary, glucose: undefined });
    const result = await dashboardService.getGlucoseData();
    expect(result.value).toBe(0);
  });
});

describe('dashboardService.getAlerts', () => {
  it('returns alerts from summary', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, mockSummary);
    const result = await dashboardService.getAlerts();
    expect(result).toEqual(mockSummary.alerts);
  });

  it('returns empty array when no alerts', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, { ...mockSummary, alerts: undefined });
    const result = await dashboardService.getAlerts();
    expect(result).toEqual([]);
  });
});

describe('dashboardService.getMedicationData', () => {
  it('returns medication data', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, mockSummary);
    const result = await dashboardService.getMedicationData();
    expect(result.taken_count).toBe(2);
  });

  it('returns default on missing data', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, { ...mockSummary, medication: undefined });
    const result = await dashboardService.getMedicationData();
    expect(result.taken_count).toBe(0);
  });
});

describe('dashboardService.getNutritionData', () => {
  it('returns nutrition data', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, mockSummary);
    const result = await dashboardService.getNutritionData();
    expect(result.calories.consumed).toBe(1200);
  });

  it('returns default on missing', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, { ...mockSummary, nutrition: undefined });
    const result = await dashboardService.getNutritionData();
    expect(result.calories.goal).toBe(1800);
  });
});

describe('dashboardService.getActivityData', () => {
  it('returns activity data', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, mockSummary);
    const result = await dashboardService.getActivityData();
    expect(result.steps.value).toBe(5000);
  });

  it('returns default on missing', async () => {
    mock.onGet(/\/v1\/dashboard\/summary/).reply(200, { ...mockSummary, activity: undefined });
    const result = await dashboardService.getActivityData();
    expect(result.steps.goal).toBe(8000);
  });
});

describe('dashboardService.getGlucoseHistory', () => {
  it('returns history without params', async () => {
    const data = [{ id: 1, value: 5.5 }];
    mock.onGet('/v1/glucose/history').reply(200, data);
    const result = await dashboardService.getGlucoseHistory();
    expect(result).toEqual(data);
  });

  it('returns history with params', async () => {
    const data = [{ id: 2, value: 6.0 }];
    mock.onGet(/\/v1\/glucose\/history/).reply(200, data);
    const result = await dashboardService.getGlucoseHistory({ start: '2024-01-01', end: '2024-01-07', limit: 10 });
    expect(result).toEqual(data);
  });

  it('returns empty array on error', async () => {
    mock.onGet(/\/v1\/glucose\/history/).reply(500);
    const result = await dashboardService.getGlucoseHistory();
    expect(result).toEqual([]);
  });
});
