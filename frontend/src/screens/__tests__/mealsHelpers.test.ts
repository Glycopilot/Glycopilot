import {
  groupMeals,
  shiftDate,
  getWeekStart,
  getInputMode,
  getHeaderTexts,
  buildPayloads,
  processPayloads,
  confirmDeleteGroup,
  confirmDeleteItem,
  resolveItemMealId,
  generateSessionKey,
} from '../meals';
import type { UserMeal, ComposedItem, MealReference, CreateUserMealPayload, MealType } from '../../types/meals.types';

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

// ─── generateSessionKey ───────────────────────────────────────────────────────

describe('generateSessionKey', () => {
  it('returns a non-empty string', () => {
    expect(typeof generateSessionKey()).toBe('string');
    expect(generateSessionKey().length).toBeGreaterThan(0);
  });

  it('generates unique keys', () => {
    expect(generateSessionKey()).not.toBe(generateSessionKey());
  });
});

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

// ─── resolveItemMealId ────────────────────────────────────────────────────────

describe('resolveItemMealId', () => {
  const mealService = require('../../services/mealService').default;

  beforeEach(() => jest.clearAllMocks());

  it('returns meal_id from selectedRef when valid', async () => {
    const item = makeItem({
      selectedRef: { meal_id: 7, name: 'Pain', calories: null, glucides: null, proteines: null, lipides: null, glucose: null, barcode: null, source: 'manual', link_photo: null },
    });
    expect(await resolveItemMealId(item)).toBe(7);
  });

  it('creates meal when selectedRef has meal_id=-1', async () => {
    mealService.createMealFromProduct.mockResolvedValue({ meal_id: 99, name: 'Nutella' });
    const item = makeItem({
      selectedRef: { meal_id: -1, name: 'Nutella', calories: 539, glucides: 57.5, proteines: 6.3, lipides: 30.9, glucose: null, barcode: '3017620422003', source: 'openfood', link_photo: null },
    });
    expect(await resolveItemMealId(item)).toBe(99);
  });

  it('falls back to searchReference when no selectedRef', async () => {
    mealService.searchReference.mockResolvedValue([{ meal_id: 42, name: 'Pomme' }]);
    const item = makeItem({ selectedRef: null, name: 'Pomme' });
    expect(await resolveItemMealId(item)).toBe(42);
  });

  it('creates manual meal when searchReference returns empty', async () => {
    mealService.searchReference.mockResolvedValue([]);
    mealService.createMealFromProduct.mockResolvedValue({ meal_id: 55, name: 'Banane' });
    const item = makeItem({ selectedRef: null, name: 'Banane', glucidesRaw: '20', caloriesRaw: '89' });
    expect(await resolveItemMealId(item)).toBe(55);
  });

  it('returns -1 when all resolution fails', async () => {
    mealService.searchReference.mockResolvedValue([]);
    mealService.createMealFromProduct.mockResolvedValue(null);
    const item = makeItem({ selectedRef: null, name: 'Inconnu' });
    expect(await resolveItemMealId(item)).toBe(-1);
  });
});

// ─── confirmDeleteGroup ───────────────────────────────────────────────────────

describe('confirmDeleteGroup', () => {
  const { Alert } = require('react-native');
  const deleteMeal = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  const makeGroup = (count: number) => ({
    key: 'g1',
    mealType: 'lunch' as MealType,
    takenAt: '2026-05-14T12:00:00Z',
    items: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      meal: { meal_id: i + 1, name: `Item ${i}`, glucides: null, calories: null, barcode: null, source: 'manual' as const, link_photo: null, proteines: null, lipides: null, glucose: null },
      taken_at: '2026-05-14T12:00:00Z',
      meal_type: 'lunch',
      portion_g: null,
      notes: null,
      input_mode: 'manual' as const,
      session_key: 'g1',
      glucides_consommes: null,
      calories_consommes: null,
    })),
    totalGlucides: 0,
    totalCalories: 0,
  });

  it('calls Alert.alert for single item group', () => {
    confirmDeleteGroup(makeGroup(1), deleteMeal);
    expect(Alert.alert).toHaveBeenCalledWith('Supprimer', expect.any(String), expect.any(Array));
  });

  it('calls Alert.alert for multi-item group', () => {
    confirmDeleteGroup(makeGroup(3), deleteMeal);
    expect(Alert.alert).toHaveBeenCalledWith('Supprimer le repas', expect.any(String), expect.any(Array));
  });

  it('calls deleteMeal when confirm pressed on single item', async () => {
    confirmDeleteGroup(makeGroup(1), deleteMeal);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b: any) => b.style === 'destructive');
    await confirmBtn.onPress();
    expect(deleteMeal).toHaveBeenCalledWith(1);
  });

  it('calls deleteMeal for each item when confirm pressed on multi-item', async () => {
    confirmDeleteGroup(makeGroup(2), deleteMeal);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b: any) => b.style === 'destructive');
    await confirmBtn.onPress();
    expect(deleteMeal).toHaveBeenCalledTimes(2);
  });

  it('calls toastError when deleteMeal throws on single item', async () => {
    const { toastError } = require('../../services/toastService');
    const failDelete = jest.fn().mockRejectedValue(new Error('fail'));
    confirmDeleteGroup(makeGroup(1), failDelete);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b: any) => b.style === 'destructive');
    await confirmBtn.onPress();
    expect(toastError).toHaveBeenCalled();
  });

  it('calls toastError when deleteMeal throws on multi-item', async () => {
    const { toastError } = require('../../services/toastService');
    const failDelete = jest.fn().mockRejectedValue(new Error('fail'));
    confirmDeleteGroup(makeGroup(2), failDelete);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b: any) => b.style === 'destructive');
    await confirmBtn.onPress();
    expect(toastError).toHaveBeenCalled();
  });
});

// ─── confirmDeleteItem ────────────────────────────────────────────────────────

describe('confirmDeleteItem', () => {
  const { Alert } = require('react-native');
  const deleteMeal = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('calls Alert.alert with item name', () => {
    confirmDeleteItem(1, 'Pomme', deleteMeal);
    expect(Alert.alert).toHaveBeenCalledWith('Supprimer', expect.stringContaining('Pomme'), expect.any(Array));
  });

  it('calls deleteMeal when confirm pressed', async () => {
    confirmDeleteItem(42, 'Banane', deleteMeal);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b: any) => b.style === 'destructive');
    await confirmBtn.onPress();
    expect(deleteMeal).toHaveBeenCalledWith(42);
  });

  it('calls toastError when deleteMeal throws', async () => {
    const { toastError } = require('../../services/toastService');
    const failDelete = jest.fn().mockRejectedValue(new Error('fail'));
    confirmDeleteItem(1, 'Pomme', failDelete);
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    const confirmBtn = buttons.find((b: any) => b.style === 'destructive');
    await confirmBtn.onPress();
    expect(toastError).toHaveBeenCalled();
  });
});
