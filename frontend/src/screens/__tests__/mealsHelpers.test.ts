import {
  groupMeals,
  shiftDate,
  getWeekStart,
  getInputMode,
  getHeaderTexts,
  buildPayloads,
  processPayloads,
} from '../meals';
import type { UserMeal, ComposedItem, MealReference, CreateUserMealPayload } from '../../types/meals.types';

jest.mock('../../services/mealService', () => ({
  __esModule: true,
  default: {
    searchReference: jest.fn().mockResolvedValue([]),
    createMealFromProduct: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../services/toastService', () => ({
  toastSuccess: jest.fn(),
  toastError: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMeal(overrides: Partial<UserMeal> = {}): UserMeal {
  return {
    id: 1,
    meal: { meal_id: 1, name: 'Pomme', glucides: 10, calories: 52, barcode: null, source: 'manual', link_photo: null, proteines: 0, lipides: 0, glucose: null },
    taken_at: '2026-05-14T12:00:00Z',
    meal_type: 'lunch',
    portion_g: 150,
    notes: null,
    input_mode: 'manual',
    session_key: null,
    glucides_consommes: 15,
    calories_consommes: 78,
    ...overrides,
  };
}

function makeItem(overrides: Partial<ComposedItem> = {}): ComposedItem {
  return {
    tempId: 'test-1',
    name: 'Pomme',
    selectedRef: null,
    portionG: '150',
    glucidesRaw: '10',
    caloriesRaw: '52',
    ...overrides,
  };
}

// ─── groupMeals ───────────────────────────────────────────────────────────────

describe('groupMeals', () => {
  it('returns empty array for no meals', () => {
    expect(groupMeals([])).toEqual([]);
  });

  it('groups meals with same session_key', () => {
    const meals = [
      makeMeal({ id: 1, session_key: 'abc', meal_type: 'lunch' }),
      makeMeal({ id: 2, session_key: 'abc', meal_type: 'lunch' }),
    ];
    const groups = groupMeals(meals);
    expect(groups).toHaveLength(1);
    expect(groups[0].items).toHaveLength(2);
  });

  it('keeps meals with different session_keys separate', () => {
    const meals = [
      makeMeal({ id: 1, session_key: 'abc' }),
      makeMeal({ id: 2, session_key: 'xyz' }),
    ];
    expect(groupMeals(meals)).toHaveLength(2);
  });

  it('treats null session_key as individual group', () => {
    const meals = [
      makeMeal({ id: 1, session_key: null }),
      makeMeal({ id: 2, session_key: null }),
    ];
    expect(groupMeals(meals)).toHaveLength(2);
  });

  it('sums glucides_consommes across group', () => {
    const meals = [
      makeMeal({ id: 1, session_key: 'abc', glucides_consommes: 10 }),
      makeMeal({ id: 2, session_key: 'abc', glucides_consommes: 20 }),
    ];
    const groups = groupMeals(meals);
    expect(groups[0].totalGlucides).toBe(30);
  });
});

// ─── shiftDate ────────────────────────────────────────────────────────────────

describe('shiftDate', () => {
  it('round-trip: shift +1 then -1 returns original', () => {
    const base = '2026-05-14';
    expect(shiftDate(shiftDate(base, 1), -1)).toBe(base);
  });

  it('round-trip: shift +7 then -7 returns original', () => {
    const base = '2026-05-14';
    expect(shiftDate(shiftDate(base, 7), -7)).toBe(base);
  });

  it('shifting 0 days returns same date', () => {
    const base = '2026-05-14';
    const result = shiftDate(base, 0);
    // Round-trip: going back returns base
    expect(shiftDate(result, 0)).toBe(result);
  });

  it('shifting forward increases the date', () => {
    const base = '2026-05-14';
    const forward = shiftDate(base, 1);
    expect(forward > base).toBe(true);
  });

  it('shifting backward decreases the date', () => {
    const base = '2026-05-14';
    const backward = shiftDate(base, -1);
    expect(backward < base).toBe(true);
  });
});

// ─── getWeekStart ─────────────────────────────────────────────────────────────

describe('getWeekStart', () => {
  it('returns a Monday (day=1)', () => {
    const weekStart = getWeekStart('2026-05-13');
    const d = new Date(weekStart + 'T12:00:00Z');
    expect(d.getUTCDay()).toBe(1);
  });

  it('returns the same day when given a Monday', () => {
    const monday = '2026-05-11';
    expect(getWeekStart(monday)).toBe(monday);
  });

  it('week start is at most 6 days before the given date', () => {
    const date = '2026-05-17';
    const start = getWeekStart(date);
    expect(start <= date).toBe(true);
    const diff = (new Date(date + 'T12:00:00Z').getTime() - new Date(start + 'T12:00:00Z').getTime()) / 86400000;
    expect(diff).toBeLessThanOrEqual(6);
  });
});

// ─── getInputMode ─────────────────────────────────────────────────────────────

describe('getInputMode', () => {
  const ref: MealReference = { meal_id: 1, name: 'Test', calories: null, glucides: null, proteines: null, lipides: null, glucose: null, barcode: null, source: 'manual', link_photo: null };

  it('returns barcode when selectedRef has barcode', () => {
    expect(getInputMode(makeItem({ selectedRef: { ...ref, barcode: '123' } }))).toBe('barcode');
  });

  it('returns search when selectedRef exists but no barcode', () => {
    expect(getInputMode(makeItem({ selectedRef: ref }))).toBe('search');
  });

  it('returns manual when no selectedRef', () => {
    expect(getInputMode(makeItem({ selectedRef: null }))).toBe('manual');
  });
});

// ─── getHeaderTexts ───────────────────────────────────────────────────────────

describe('getHeaderTexts', () => {
  it('returns week range in week mode', () => {
    const result = getHeaderTexts('week', '2026-05-11', '2026-05-17', false, '2026-05-14');
    expect(result.subtitle).toContain('mai');
  });

  it('returns Aujourd\'hui when day mode and isToday', () => {
    const result = getHeaderTexts('day', '2026-05-11', '2026-05-17', true, '2026-05-14');
    expect(result.subtitle).toBe("Aujourd'hui");
  });

  it('returns formatted date when day mode and not today', () => {
    const result = getHeaderTexts('day', '2026-05-11', '2026-05-17', false, '2026-05-14');
    expect(result.subtitle).toBeTruthy();
    expect(result.subtitle).not.toBe("Aujourd'hui");
  });

  it('returns Repas du jour as section title in day mode', () => {
    const result = getHeaderTexts('day', '2026-05-11', '2026-05-17', true, '2026-05-14');
    expect(result.sectionTitle).toBe('Repas du jour');
  });

  it('returns Aujourd\'hui as section title in week mode and isToday', () => {
    const result = getHeaderTexts('week', '2026-05-11', '2026-05-17', true, '2026-05-14');
    expect(result.sectionTitle).toBe("Aujourd'hui");
  });

  it('returns formatted date as section title in week mode and not today', () => {
    const result = getHeaderTexts('week', '2026-05-11', '2026-05-17', false, '2026-05-14');
    expect(result.sectionTitle).toBeTruthy();
    expect(result.sectionTitle).not.toBe('Repas du jour');
    expect(result.sectionTitle).not.toBe("Aujourd'hui");
  });
});

// ─── buildPayloads ────────────────────────────────────────────────────────────

describe('buildPayloads', () => {
  const mealService = require('../../services/mealService').default;

  beforeEach(() => jest.clearAllMocks());

  it('returns payload for item with valid meal_id', async () => {
    const item = makeItem({
      selectedRef: { meal_id: 5, name: 'Pain', calories: null, glucides: null, proteines: null, lipides: null, glucose: null, barcode: null, source: 'manual', link_photo: null },
    });
    const payloads = await buildPayloads([item], 'lunch', undefined, '2026-05-14T12:00:00Z');
    expect(payloads).toHaveLength(1);
    expect(payloads[0].meal_id).toBe(5);
    expect(payloads[0].meal_type).toBe('lunch');
    expect(payloads[0].input_mode).toBe('search');
  });

  it('skips items where mealId stays -1', async () => {
    const item = makeItem({ selectedRef: null, name: 'Inconnu' });
    mealService.searchReference.mockResolvedValue([]);
    mealService.createMealFromProduct.mockResolvedValue(null);
    const payloads = await buildPayloads([item], 'lunch', undefined, '2026-05-14T12:00:00Z');
    expect(payloads).toHaveLength(0);
  });

  it('sets session_key when provided', async () => {
    const item = makeItem({
      selectedRef: { meal_id: 5, name: 'Test', calories: null, glucides: null, proteines: null, lipides: null, glucose: null, barcode: null, source: 'manual', link_photo: null },
    });
    const payloads = await buildPayloads([item], 'dinner', 'session-abc', '2026-05-14T12:00:00Z');
    expect(payloads[0].session_key).toBe('session-abc');
  });

  it('sets portion_g when portionG is provided', async () => {
    const item = makeItem({
      portionG: '200',
      selectedRef: { meal_id: 3, name: 'Test', calories: null, glucides: null, proteines: null, lipides: null, glucose: null, barcode: null, source: 'manual', link_photo: null },
    });
    const payloads = await buildPayloads([item], 'lunch', undefined, '2026-05-14T12:00:00Z');
    expect(payloads[0].portion_g).toBe(200);
  });

  it('resolves via searchReference when no selectedRef', async () => {
    mealService.searchReference.mockResolvedValue([{ meal_id: 42, name: 'Pomme' }]);
    const item = makeItem({ selectedRef: null, name: 'Pomme' });
    const payloads = await buildPayloads([item], 'snack', undefined, '2026-05-14T12:00:00Z');
    expect(payloads[0].meal_id).toBe(42);
  });
});

// ─── processPayloads ─────────────────────────────────────────────────────────

describe('processPayloads', () => {
  const { toastError, toastSuccess } = require('../../services/toastService');
  const addMeals = jest.fn();
  const closeAdd = jest.fn();
  const setSubmitting = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('calls toastError when payloads is empty', async () => {
    await processPayloads([], addMeals, closeAdd, setSubmitting);
    expect(toastError).toHaveBeenCalledWith('Repas invalide', expect.any(String));
    expect(setSubmitting).toHaveBeenCalledWith(false);
  });

  it('calls closeAdd and toastSuccess on success', async () => {
    addMeals.mockResolvedValue(true);
    const payload: CreateUserMealPayload = { meal_id: 1, taken_at: '2026-05-14T12:00:00Z', meal_type: 'lunch', input_mode: 'manual' };
    await processPayloads([payload], addMeals, closeAdd, setSubmitting);
    expect(closeAdd).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith('Repas enregistré', 'Ajouté au journal');
  });

  it('shows multi-items message when more than 1 payload', async () => {
    addMeals.mockResolvedValue(true);
    const payload: CreateUserMealPayload = { meal_id: 1, taken_at: '2026-05-14T12:00:00Z', meal_type: 'lunch', input_mode: 'manual' };
    await processPayloads([payload, payload], addMeals, closeAdd, setSubmitting);
    expect(toastSuccess).toHaveBeenCalledWith('Repas enregistré', '2 aliments ajoutés');
  });

  it('calls toastError when addMeals returns false', async () => {
    addMeals.mockResolvedValue(false);
    const payload: CreateUserMealPayload = { meal_id: 1, taken_at: '2026-05-14T12:00:00Z', meal_type: 'lunch', input_mode: 'manual' };
    await processPayloads([payload], addMeals, closeAdd, setSubmitting);
    expect(toastError).toHaveBeenCalledWith('Erreur', expect.any(String));
    expect(closeAdd).not.toHaveBeenCalled();
  });
});
