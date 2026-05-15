import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useMeals } from '../useMeals';
import mealService from '../../services/mealService';

jest.mock('../../services/mealService', () => ({
  __esModule: true,
  default: {
    getLog: jest.fn(),
    getDailySummary: jest.fn(),
    addMeal: jest.fn(),
    deleteMeal: jest.fn(),
  },
}));

const mockMeal = {
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
};

const mockSummary = {
  date: '2026-05-14',
  total_glucides: 15,
  total_calories: 78,
  total_proteines: 0,
  total_lipides: 0,
  meal_count: 1,
  meals_by_type: { breakfast: 0, lunch: 1, snack: 0, dinner: 0 },
};

describe('useMeals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mealService.getLog as jest.Mock).mockResolvedValue([mockMeal]);
    (mealService.getDailySummary as jest.Mock).mockResolvedValue(mockSummary);
  });

  it('loads meals and summary on mount', async () => {
    const { result } = renderHook(() => useMeals());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.meals).toEqual([mockMeal]);
    expect(result.current.summary).toEqual(mockSummary);
  });

  it('returns today as default selected date', () => {
    const { result } = renderHook(() => useMeals());
    const today = new Date().toISOString().split('T')[0];
    expect(result.current.selectedDate).toBe(today);
  });

  it('changes date and reloads data', async () => {
    const { result } = renderHook(() => useMeals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setDate('2026-05-10'));

    expect(result.current.selectedDate).toBe('2026-05-10');
    await waitFor(() => expect(mealService.getLog).toHaveBeenCalledWith('2026-05-10'));
  });

  it('adds meals and reloads', async () => {
    (mealService.addMeal as jest.Mock).mockResolvedValue(mockMeal);
    const { result } = renderHook(() => useMeals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.addMeals([{
        meal_id: 1,
        taken_at: '2026-05-14T12:00:00Z',
        meal_type: 'lunch',
        input_mode: 'manual',
      }]);
    });

    expect(success).toBe(true);
    expect(mealService.addMeal).toHaveBeenCalledTimes(1);
  });

  it('returns false when addMeals fails', async () => {
    (mealService.addMeal as jest.Mock).mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useMeals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.addMeals([{
        meal_id: 1,
        taken_at: '2026-05-14T12:00:00Z',
        meal_type: 'lunch',
        input_mode: 'manual',
      }]);
    });

    expect(success).toBe(false);
  });

  it('deletes a meal and reloads', async () => {
    (mealService.deleteMeal as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useMeals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteMeal(1);
    });

    expect(mealService.deleteMeal).toHaveBeenCalledWith(1);
  });

  it('refreshes data', async () => {
    const { result } = renderHook(() => useMeals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mealService.getLog).toHaveBeenCalledTimes(2);
  });

  it('handles empty meals gracefully', async () => {
    (mealService.getLog as jest.Mock).mockResolvedValue([]);
    (mealService.getDailySummary as jest.Mock).mockResolvedValue(null);

    const { result } = renderHook(() => useMeals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.meals).toEqual([]);
    expect(result.current.summary).toBeNull();
  });

  it('resets meals to empty array on load error', async () => {
    (mealService.getLog as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMeals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.meals).toEqual([]);
  });

  it('addMeal returns null on failure', async () => {
    (mealService.addMeal as jest.Mock).mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useMeals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.addMeal({
        meal_id: 1,
        taken_at: '2026-05-14T12:00:00Z',
        meal_type: 'lunch',
        input_mode: 'manual',
      });
    });
    expect(res).toBeNull();
  });

  it('addMeal returns created meal on success', async () => {
    (mealService.addMeal as jest.Mock).mockResolvedValue(mockMeal);
    const { result } = renderHook(() => useMeals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let res: any;
    await act(async () => {
      res = await result.current.addMeal({
        meal_id: 1,
        taken_at: '2026-05-14T12:00:00Z',
        meal_type: 'lunch',
        input_mode: 'manual',
      });
    });
    expect(res).toEqual(mockMeal);
  });
});
