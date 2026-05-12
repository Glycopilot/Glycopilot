process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';

import MockAdapter from 'axios-mock-adapter';
import glycemiaService from '../glycemiaService';
import apiClient from '../apiClient';

const mock = new MockAdapter(apiClient);

beforeEach(() => mock.reset());
afterAll(() => mock.restore());

describe('glycemiaService.getCurrent', () => {
  it('returns data on success', async () => {
    const entry = { id: '1', value: 5.5, measured_at: '2024-01-01T10:00:00Z' };
    mock.onGet('/glycemia/current/').reply(200, entry);
    const result = await glycemiaService.getCurrent();
    expect(result).toEqual(entry);
  });

  it('returns null on error', async () => {
    mock.onGet('/glycemia/current/').reply(500);
    const result = await glycemiaService.getCurrent();
    expect(result).toBeNull();
  });
});

describe('glycemiaService.getHistory', () => {
  const entries = [{ id: '1', value: 5.5, measured_at: '2024-01-01T10:00:00Z' }];

  it('returns entries with default period', async () => {
    mock.onGet('/glycemia/range/').reply(200, { entries, stats: {}, range_days: 7 });
    const result = await glycemiaService.getHistory();
    expect(result).toEqual(entries);
  });

  it('handles period=day', async () => {
    mock.onGet('/glycemia/range/').reply(200, { entries, stats: {}, range_days: 1 });
    const result = await glycemiaService.getHistory({ period: 'day' });
    expect(result).toEqual(entries);
  });

  it('handles period=week', async () => {
    mock.onGet('/glycemia/range/').reply(200, { entries, stats: {}, range_days: 7 });
    const result = await glycemiaService.getHistory({ period: 'week' });
    expect(result).toEqual(entries);
  });

  it('handles period=month', async () => {
    mock.onGet('/glycemia/range/').reply(200, { entries, stats: {}, range_days: 30 });
    const result = await glycemiaService.getHistory({ period: 'month' });
    expect(result).toEqual(entries);
  });

  it('returns empty array on error', async () => {
    mock.onGet('/glycemia/range/').reply(500);
    const result = await glycemiaService.getHistory();
    expect(result).toEqual([]);
  });

  it('returns empty array when entries missing', async () => {
    mock.onGet('/glycemia/range/').reply(200, { stats: {} });
    const result = await glycemiaService.getHistory();
    expect(result).toEqual([]);
  });
});

describe('glycemiaService.getTodayHistory', () => {
  it('calls getHistory with day period', async () => {
    mock.onGet('/glycemia/range/').reply(200, { entries: [], stats: {} });
    const result = await glycemiaService.getTodayHistory();
    expect(result).toEqual([]);
  });
});

describe('glycemiaService.getWeekHistory', () => {
  it('calls getHistory with week period', async () => {
    mock.onGet('/glycemia/range/').reply(200, { entries: [], stats: {} });
    const result = await glycemiaService.getWeekHistory();
    expect(result).toEqual([]);
  });
});

describe('glycemiaService.getMonthHistory', () => {
  it('calls getHistory with month period', async () => {
    mock.onGet('/glycemia/range/').reply(200, { entries: [], stats: {} });
    const result = await glycemiaService.getMonthHistory();
    expect(result).toEqual([]);
  });
});

describe('glycemiaService.createManualReading', () => {
  it('creates a reading and returns data', async () => {
    const entry = { id: '2', value: 6.0, measured_at: '2024-01-02T08:00:00Z' };
    mock.onPost('/glycemia/manual-readings/').reply(201, entry);
    const result = await glycemiaService.createManualReading({
      measured_at: '2024-01-02T08:00:00Z',
      value: 6.0,
      context: 'fasting',
    });
    expect(result).toEqual(entry);
  });

  it('returns null on error', async () => {
    mock.onPost('/glycemia/manual-readings/').reply(400);
    const result = await glycemiaService.createManualReading({
      measured_at: '2024-01-02T08:00:00Z',
      value: 6.0,
    });
    expect(result).toBeNull();
  });
});

describe('glycemiaService.createCgmReading', () => {
  it('creates a CGM reading', async () => {
    const entry = { id: '3', value: 5.8, measured_at: '2024-01-02T09:00:00Z' };
    mock.onPost('/glycemia/cgm-readings/').reply(201, entry);
    const result = await glycemiaService.createCgmReading({
      measured_at: '2024-01-02T09:00:00Z',
      value: 5.8,
    });
    expect(result).toEqual(entry);
  });

  it('returns null on error', async () => {
    mock.onPost('/glycemia/cgm-readings/').reply(500);
    const result = await glycemiaService.createCgmReading({
      measured_at: '2024-01-02T09:00:00Z',
      value: 5.8,
    });
    expect(result).toBeNull();
  });
});

describe('glycemiaService.transformForChart', () => {
  it('returns placeholder when history is empty', () => {
    const result = glycemiaService.transformForChart([]);
    expect(result.labels).toEqual(['--']);
    expect(result.datasets[0].data).toEqual([100]);
  });

  it('transforms day period correctly', () => {
    const history = [
      { id: '1', value: 5.0, measured_at: '2024-01-01T08:00:00Z' } as any,
      { id: '2', value: 6.0, measured_at: '2024-01-01T12:00:00Z' } as any,
    ];
    const result = glycemiaService.transformForChart(history, 'day');
    expect(result.labels.length).toBeGreaterThan(0);
    expect(result.datasets[0].data).toContain(5.0);
  });

  it('transforms week period correctly', () => {
    const history = Array.from({ length: 14 }, (_, i) => ({
      id: String(i),
      value: 5.0 + i * 0.1,
      measured_at: new Date(2024, 0, i + 1).toISOString(),
    })) as any[];
    const result = glycemiaService.transformForChart(history, 'week');
    expect(result.labels.length).toBeGreaterThan(0);
  });

  it('transforms month period correctly', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      value: 5.0 + i * 0.05,
      measured_at: new Date(2024, 0, i + 1).toISOString(),
    })) as any[];
    const result = glycemiaService.transformForChart(history, 'month');
    expect(result.labels.length).toBeLessThanOrEqual(10);
  });

  it('limits labels to 10 max', () => {
    const history = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      value: 5.0,
      measured_at: new Date(2024, 0, 1, i % 24, 0, 0).toISOString(),
    })) as any[];
    const result = glycemiaService.transformForChart(history, 'day');
    expect(result.labels.length).toBeLessThanOrEqual(10);
  });
});
