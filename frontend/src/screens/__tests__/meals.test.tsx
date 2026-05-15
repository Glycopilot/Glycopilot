import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NutritionScreen from '../meals';

jest.mock('../../components/common/Layout', () => {
  const { View } = require('react-native');
  return function MockLayout({ children }: any) {
    return <View>{children}</View>;
  };
});


const mockAddMeals = jest.fn().mockResolvedValue(true);
const mockDeleteMeal = jest.fn().mockResolvedValue(undefined);
const mockSetDate = jest.fn();

const baseMealsHook = {
  meals: [],
  summary: null,
  selectedDate: '2026-05-14',
  loading: false,
  refreshing: false,
  setDate: mockSetDate,
  refresh: jest.fn(),
  addMeals: mockAddMeals,
  deleteMeal: mockDeleteMeal,
};

jest.mock('../../hooks/useMeals', () => ({
  useMeals: jest.fn(),
}));

jest.mock('../../services/mealService', () => ({
  __esModule: true,
  default: {
    getRangeSummary: jest.fn().mockResolvedValue([
      { date: '2026-05-12', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-13', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-14', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-15', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-16', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-17', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-18', total_glucides: 0, total_calories: 0, meal_count: 0 },
    ]),
    searchOpenFoodFacts: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('../../services/toastService', () => ({
  toastSuccess: jest.fn(),
  toastError: jest.fn(),
}));

const mockNavigation = { navigate: jest.fn(), reset: jest.fn() };

describe('NutritionScreen', () => {
  const { useMeals } = require('../../hooks/useMeals');

  beforeEach(() => {
    jest.clearAllMocks();
    useMeals.mockReturnValue(baseMealsHook);
  });

  it('renders without crashing', () => {
    expect(() =>
      render(<NutritionScreen navigation={mockNavigation} />)
    ).not.toThrow();
  });

  it('shows the Nutrition title', async () => {
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Nutrition')).toBeTruthy());
  });

  it('shows Jour and Semaine toggle', async () => {
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('Jour')).toBeTruthy();
      expect(getByText('Semaine')).toBeTruthy();
    });
  });

  it('shows empty state when no meals', async () => {
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() =>
      expect(getByText('Aucun repas enregistré')).toBeTruthy()
    );
  });

  it('shows meal name when meals exist', async () => {
    useMeals.mockReturnValue({
      ...baseMealsHook,
      meals: [
        {
          id: 1,
          meal: {
            meal_id: 1,
            name: 'Pomme',
            glucides: 10,
            calories: 52,
            barcode: null,
            source: 'manual',
            link_photo: null,
            proteines: 0,
            lipides: 0,
            glucose: null,
          },
          taken_at: '2026-05-14T08:00:00Z',
          meal_type: 'breakfast',
          portion_g: 150,
          notes: null,
          input_mode: 'manual',
          session_key: null,
          glucides_consommes: 15,
          calories_consommes: 78,
        },
      ],
      summary: {
        date: '2026-05-14',
        total_glucides: 15,
        total_calories: 78,
        total_proteines: 0,
        total_lipides: 0,
        meal_count: 1,
        meals_by_type: { breakfast: 1, lunch: 0, snack: 0, dinner: 0 },
      },
    });

    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Pomme')).toBeTruthy());
  });

  it('switches to week mode and shows week-specific empty text', async () => {
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Semaine')).toBeTruthy());

    fireEvent.press(getByText('Semaine'));

    // Le texte de l'etat vide semaine est unique (different de celui du mode jour)
    await waitFor(() =>
      expect(getByText(/Passez en mode/)).toBeTruthy()
    );
  });

  it('shows week empty state when no meals this week', async () => {
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Semaine'));

    await waitFor(() =>
      expect(getByText(/cette semaine/)).toBeTruthy()
    );
  });

  it('shows week summary card when week has data', async () => {
    const mealServiceMock = require('../../services/mealService').default;
    mealServiceMock.getRangeSummary.mockResolvedValue([
      { date: '2026-05-12', total_glucides: 120, total_calories: 1800, meal_count: 3 },
      { date: '2026-05-13', total_glucides: 85, total_calories: 1200, meal_count: 2 },
      { date: '2026-05-14', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-15', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-16', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-17', total_glucides: 0, total_calories: 0, meal_count: 0 },
      { date: '2026-05-18', total_glucides: 0, total_calories: 0, meal_count: 0 },
    ]);

    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Semaine'));

    await waitFor(() => {
      expect(getByText('Glucides de la semaine')).toBeTruthy();
      expect(getByText('205g')).toBeTruthy();
    });
  });

  it('shows daily glucides in summary card', async () => {
    useMeals.mockReturnValue({
      ...baseMealsHook,
      summary: {
        date: '2026-05-14',
        total_glucides: 145,
        total_calories: 2100,
        total_proteines: 70,
        total_lipides: 80,
        meal_count: 3,
        meals_by_type: { breakfast: 1, lunch: 1, snack: 0, dinner: 1 },
      },
    });

    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => {
      expect(getByText('145g')).toBeTruthy();
      expect(getByText('2100 kcal')).toBeTruthy();
    });
  });

  it('shows loading spinner while fetching', () => {
    useMeals.mockReturnValue({ ...baseMealsHook, loading: true });
    const { UNSAFE_getByType } = render(
      <NutritionScreen navigation={mockNavigation} />
    );
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('does not call navigate on initial render', async () => {
    render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(mockNavigation.navigate).not.toHaveBeenCalled());
  });

  it('expands solo meal card when pressed', async () => {
    useMeals.mockReturnValue({
      ...baseMealsHook,
      meals: [{
        id: 1,
        meal: { meal_id: 1, name: 'Pomme', glucides: 10, calories: 52, barcode: null, source: 'manual', link_photo: null, proteines: 0, lipides: 0, glucose: null },
        taken_at: '2026-05-14T08:00:00Z',
        meal_type: 'breakfast',
        portion_g: 150,
        notes: 'test note',
        input_mode: 'manual',
        session_key: null,
        glucides_consommes: 15,
        calories_consommes: 78,
      }],
    });
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Pomme')).toBeTruthy());
    fireEvent.press(getByText('Pomme'));
    await waitFor(() => expect(getByText('78 kcal')).toBeTruthy());
  });

  it('expands composed meal card and shows items', async () => {
    const baseMeal = { meal_id: 1, name: 'Pomme', glucides: 10, calories: 52, barcode: null, source: 'manual' as const, link_photo: null, proteines: 0, lipides: 0, glucose: null };
    useMeals.mockReturnValue({
      ...baseMealsHook,
      meals: [
        { id: 1, meal: baseMeal, taken_at: '2026-05-14T12:00:00Z', meal_type: 'lunch', portion_g: 100, notes: null, input_mode: 'manual', session_key: 'sk1', glucides_consommes: 10, calories_consommes: 52 },
        { id: 2, meal: { ...baseMeal, meal_id: 2, name: 'Pain' }, taken_at: '2026-05-14T12:00:00Z', meal_type: 'lunch', portion_g: 60, notes: null, input_mode: 'manual', session_key: 'sk1', glucides_consommes: 30, calories_consommes: 150 },
      ],
    });
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText(/Pomme/)).toBeTruthy());
    fireEvent.press(getByText(/Pomme/));
    await waitFor(() => expect(getByText('Pain')).toBeTruthy());
  });

  it('opens add modal when + button pressed', async () => {
    const { getByText, UNSAFE_getAllByType } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Nutrition')).toBeTruthy());
    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    const addBtn = touchables.at(-1);
    fireEvent.press(addBtn);
    await waitFor(() => expect(getByText('Composer un repas')).toBeTruthy());
  });

  it('shows Auj. button when navigating to a past date', async () => {
    useMeals.mockReturnValue({
      ...baseMealsHook,
      selectedDate: '2026-04-01',
    });
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Auj.')).toBeTruthy());
  });

  it('closes add modal after successful submit', async () => {
    mockAddMeals.mockResolvedValue(true);
    const { getByText, UNSAFE_getAllByType } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText('Nutrition')).toBeTruthy());

    const { TouchableOpacity } = require('react-native');
    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables.at(-1));

    await waitFor(() => expect(getByText('Composer un repas')).toBeTruthy());
  });

  it('deletes a composed meal item', async () => {
    const { Alert } = require('react-native');
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const baseMeal = { meal_id: 1, name: 'Pomme', glucides: 10, calories: 52, barcode: null, source: 'manual' as const, link_photo: null, proteines: 0, lipides: 0, glucose: null };
    useMeals.mockReturnValue({
      ...baseMealsHook,
      meals: [
        { id: 1, meal: baseMeal, taken_at: '2026-05-14T12:00:00Z', meal_type: 'lunch', portion_g: 100, notes: null, input_mode: 'manual', session_key: 'sk1', glucides_consommes: 10, calories_consommes: 52 },
        { id: 2, meal: { ...baseMeal, meal_id: 2, name: 'Pain' }, taken_at: '2026-05-14T12:00:00Z', meal_type: 'lunch', portion_g: 60, notes: null, input_mode: 'manual', session_key: 'sk1', glucides_consommes: 30, calories_consommes: 150 },
      ],
    });
    const { getByText } = render(<NutritionScreen navigation={mockNavigation} />);
    await waitFor(() => expect(getByText(/Pomme/)).toBeTruthy());
    fireEvent.press(getByText(/Pomme/));
    await waitFor(() => expect(getByText('Supprimer')).toBeTruthy());
    fireEvent.press(getByText('Supprimer'));
    expect(Alert.alert).toHaveBeenCalled();
  });
});
