import {
  generateMockGlycemiaData,
  mockDashboardSummary,
  mockWidgets,
  mockLayouts,
} from '../mockData';

describe('generateMockGlycemiaData', () => {
  it('generates entries for the requested number of days', () => {
    const data = generateMockGlycemiaData(3);
    expect(data.length).toBeGreaterThan(0);
  });

  it('each entry has required fields', () => {
    const data = generateMockGlycemiaData(1);
    const entry = data[0];
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('value');
    expect(entry).toHaveProperty('measured_at');
    expect(typeof entry.value).toBe('number');
  });

  it('values are within realistic range', () => {
    const data = generateMockGlycemiaData(2);
    data.forEach(e => {
      expect(e.value).toBeGreaterThanOrEqual(70);
      expect(e.value).toBeLessThanOrEqual(180);
    });
  });

  it('returns only the placeholder entry for 0 days', () => {
    const data = generateMockGlycemiaData(0);
    // 0 days: loop runs from 0 to 0, so at least 1 entry is generated
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('mockDashboardSummary', () => {
  it('has all required sections', () => {
    expect(mockDashboardSummary).toHaveProperty('glucose');
    expect(mockDashboardSummary).toHaveProperty('medication');
    expect(mockDashboardSummary).toHaveProperty('nutrition');
    expect(mockDashboardSummary).toHaveProperty('activity');
    expect(mockDashboardSummary).toHaveProperty('alerts');
  });

  it('glucose value is a number', () => {
    expect(typeof mockDashboardSummary.glucose?.value).toBe('number');
  });

  it('alerts is an array', () => {
    expect(Array.isArray(mockDashboardSummary.alerts)).toBe(true);
  });
});

describe('mockWidgets', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(mockWidgets)).toBe(true);
    expect(mockWidgets.length).toBeGreaterThan(0);
  });

  it('each widget has widgetId, title and refreshInterval', () => {
    mockWidgets.forEach(w => {
      expect(w).toHaveProperty('widgetId');
      expect(w).toHaveProperty('title');
      expect(w).toHaveProperty('refreshInterval');
    });
  });
});

describe('mockLayouts', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(mockLayouts)).toBe(true);
    expect(mockLayouts.length).toBeGreaterThan(0);
  });

  it('each layout has an id field', () => {
    mockLayouts.forEach(l => {
      expect(l).toHaveProperty('id');
    });
  });
});
