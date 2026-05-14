export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export type InputMode = 'manual' | 'barcode' | 'search';
export type MealSource = 'manual' | 'openfood';

export interface MealReference {
  meal_id: number;
  name: string;
  calories: number | null;
  glucides: number | null;
  proteines: number | null;
  lipides: number | null;
  glucose: number | null;
  barcode: string | null;
  source: MealSource;
  link_photo: string | null;
}

export interface UserMeal {
  id: number;
  meal: MealReference;
  taken_at: string;
  meal_type: MealType;
  portion_g: number | null;
  notes: string | null;
  input_mode: InputMode;
  session_key: string | null;
  glucides_consommes: number | null;
  calories_consommes: number | null;
}

export interface DailySummary {
  date: string;
  total_glucides: number;
  total_calories: number;
  total_proteines: number;
  total_lipides: number;
  meal_count: number;
  meals_by_type: Record<MealType, number>;
}

export interface CreateUserMealPayload {
  meal_id: number;
  taken_at: string;
  meal_type: MealType;
  portion_g?: number;
  notes?: string;
  input_mode: InputMode;
  session_key?: string;
}

export interface ComposedItem {
  tempId: string;
  name: string;
  selectedRef: MealReference | null;
  portionG: string;
  glucidesRaw: string;
  caloriesRaw: string;
}

export interface DayGlucidesData {
  date: string;
  total_glucides: number;
  total_calories: number;
  meal_count: number;
}

export interface OpenFoodProduct {
  name: string;
  barcode: string | null;
  calories: number | null;
  glucides: number | null;
  proteines: number | null;
  lipides: number | null;
  image_url: string | null;
}
