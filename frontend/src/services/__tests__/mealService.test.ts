import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import mealService from '../mealService';
import type { CreateUserMealPayload } from '../../types/meals.types';

describe('mealService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    jest.clearAllMocks();
  });

  afterEach(() => mock.restore());

  // ─── lookupBarcode ──────────────────────────────────────────────────────────

  describe('lookupBarcode', () => {
    const barcode = '3017620422003';
    const cachedProduct = {
      meal_id: 1,
      name: 'Nutella',
      calories: 539,
      glucides: 57.5,
      proteines: 6.3,
      lipides: 30.9,
      glucose: null,
      barcode,
      source: 'openfood',
      link_photo: null,
    };

    it('returns product from local cache when found', async () => {
      mock.onGet('/meals/reference/by-barcode/').reply(200, cachedProduct);

      const result = await mealService.lookupBarcode(barcode);

      expect(result).toEqual(cachedProduct);
      expect(mock.history.post).toHaveLength(0);
    });

    it('calls from-openfood when product is not cached', async () => {
      mock.onGet('/meals/reference/by-barcode/').reply(404);
      mock.onPost('/meals/reference/from-openfood/').reply(201, cachedProduct);

      const result = await mealService.lookupBarcode(barcode);

      expect(result).toEqual(cachedProduct);
      expect(mock.history.post[0].data).toContain(barcode);
    });

    it('returns null silently on 404 from Open Food Facts', async () => {
      mock.onGet('/meals/reference/by-barcode/').reply(404);
      mock.onPost('/meals/reference/from-openfood/').reply(404);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await mealService.lookupBarcode('0000000000000');

      expect(result).toBeNull();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('returns null silently on 503 (Open Food Facts unavailable)', async () => {
      mock.onGet('/meals/reference/by-barcode/').reply(404);
      mock.onPost('/meals/reference/from-openfood/').reply(503);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await mealService.lookupBarcode('0000000000000');

      expect(result).toBeNull();
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('logs error for unexpected failures (5xx)', async () => {
      mock.onGet('/meals/reference/by-barcode/').reply(404);
      mock.onPost('/meals/reference/from-openfood/').reply(500);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await mealService.lookupBarcode(barcode);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  // ─── getRangeSummary ────────────────────────────────────────────────────────

  describe('getRangeSummary', () => {
    it('returns daily data array on success', async () => {
      const data = [
        { date: '2026-05-12', total_glucides: 120.5, total_calories: 1800, meal_count: 3 },
        { date: '2026-05-13', total_glucides: 0, total_calories: 0, meal_count: 0 },
        { date: '2026-05-14', total_glucides: 85.2, total_calories: 1200, meal_count: 2 },
      ];
      mock.onGet('/meals/log/range-summary/').reply(200, data);

      const result = await mealService.getRangeSummary('2026-05-12', '2026-05-18');

      expect(result).toEqual(data);
      expect(mock.history.get[0].params).toEqual({
        date_from: '2026-05-12',
        date_to: '2026-05-18',
      });
    });

    it('returns empty array on failure', async () => {
      mock.onGet('/meals/log/range-summary/').reply(500);

      const result = await mealService.getRangeSummary('2026-05-12', '2026-05-18');

      expect(result).toEqual([]);
    });
  });

  // ─── getLog ─────────────────────────────────────────────────────────────────

  describe('getLog', () => {
    it('returns meal log without date filter', async () => {
      const meals = [{ id: 1 }, { id: 2 }];
      mock.onGet('/meals/log/').reply(200, meals);

      const result = await mealService.getLog();

      expect(result).toEqual(meals);
    });

    it('passes date param when provided', async () => {
      mock.onGet('/meals/log/').reply(200, []);

      await mealService.getLog('2026-05-14');

      expect(mock.history.get[0].params).toEqual({ date: '2026-05-14' });
    });

    it('handles paginated response with results key', async () => {
      const meals = [{ id: 1 }, { id: 2 }];
      mock.onGet('/meals/log/').reply(200, { results: meals });

      const result = await mealService.getLog();

      expect(result).toEqual(meals);
    });
  });

  // ─── addMeal ────────────────────────────────────────────────────────────────

  describe('addMeal', () => {
    const payload: CreateUserMealPayload = {
      meal_id: 1,
      taken_at: '2026-05-14T12:00:00Z',
      meal_type: 'lunch',
      input_mode: 'manual',
      portion_g: 150,
    };

    it('returns created meal on success', async () => {
      const created = { id: 42, meal: { meal_id: 1, name: 'Pomme' }, ...payload };
      mock.onPost('/meals/log/').reply(201, created);

      const result = await mealService.addMeal(payload);

      expect(result).toEqual(created);
    });

    it('throws on failure', async () => {
      mock.onPost('/meals/log/').reply(400, { error: 'Invalid data' });

      await expect(mealService.addMeal(payload)).rejects.toThrow();
    });
  });

  // ─── getDailySummary ────────────────────────────────────────────────────────

  describe('getDailySummary', () => {
    it('returns daily summary on success', async () => {
      const summary = {
        date: '2026-05-14',
        total_glucides: 145.3,
        total_calories: 2100,
        total_proteines: 68.5,
        total_lipides: 72.1,
        meal_count: 4,
        meals_by_type: { breakfast: 1, lunch: 1, snack: 1, dinner: 1 },
      };
      mock.onGet('/meals/log/daily-summary/').reply(200, summary);

      const result = await mealService.getDailySummary('2026-05-14');

      expect(result).toEqual(summary);
    });

    it('returns null on failure', async () => {
      mock.onGet('/meals/log/daily-summary/').reply(500);

      const result = await mealService.getDailySummary('2026-05-14');

      expect(result).toBeNull();
    });
  });
});
