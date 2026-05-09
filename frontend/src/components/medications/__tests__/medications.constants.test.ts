import {
  MEAL_TIMING_LABELS,
  MEAL_TIMING_OPTIONS,
  getIntakeColor,
  getIntakeLabel,
  formatDate,
} from '../medications.constants';

describe('MEAL_TIMING_LABELS', () => {
  it('has correct labels', () => {
    expect(MEAL_TIMING_LABELS.before_meal).toBe('Avant repas');
    expect(MEAL_TIMING_LABELS.after_meal).toBe('Après repas');
    expect(MEAL_TIMING_LABELS.anytime).toBe('Indifférent');
  });
});

describe('MEAL_TIMING_OPTIONS', () => {
  it('has 3 options', () => {
    expect(MEAL_TIMING_OPTIONS).toHaveLength(3);
  });

  it('contains before_meal option', () => {
    const option = MEAL_TIMING_OPTIONS.find(o => o.value === 'before_meal');
    expect(option).toBeTruthy();
    expect(option?.label).toBe('Avant repas');
  });
});

describe('getIntakeColor', () => {
  it('returns green for taken', () => {
    expect(getIntakeColor('taken')).toBe('#10B981');
  });

  it('returns red for missed', () => {
    expect(getIntakeColor('missed')).toBe('#EF4444');
  });

  it('returns amber for snoozed', () => {
    expect(getIntakeColor('snoozed')).toBe('#F59E0B');
  });

  it('returns blue for pending', () => {
    expect(getIntakeColor('pending')).toBe('#007AFF');
  });
});

describe('getIntakeLabel', () => {
  it('returns Pris for taken', () => {
    expect(getIntakeLabel('taken')).toBe('Pris');
  });

  it('returns Manqué for missed', () => {
    expect(getIntakeLabel('missed')).toBe('Manqué');
  });

  it('returns Reporté for snoozed', () => {
    expect(getIntakeLabel('snoozed')).toBe('Reporté');
  });

  it('returns À prendre for pending', () => {
    expect(getIntakeLabel('pending')).toBe('À prendre');
  });
});

describe('formatDate', () => {
  it('formats ISO date to French locale', () => {
    const result = formatDate('2026-05-09');
    expect(result).toContain('9');
    expect(result).toContain('mai');
  });

  it('formats January correctly', () => {
    const result = formatDate('2026-01-15');
    expect(result).toContain('15');
    expect(result).toContain('janv');
  });
});
