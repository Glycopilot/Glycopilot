import apiClient from './apiClient';
import type {
  UserMeal,
  CreateUserMealPayload,
  DailySummary,
  DayGlucidesData,
  MealReference,
  OpenFoodProduct,
} from '../types/meals.types';

const mealService = {
  async getLog(date?: string): Promise<UserMeal[]> {
    const params = date ? { date } : {};
    const res = await apiClient.get<{ results: UserMeal[] } | UserMeal[]>('/meals/log/', { params });
    const data = res.data as any;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async getDailySummary(date: string): Promise<DailySummary | null> {
    try {
      const res = await apiClient.get<DailySummary>('/meals/log/daily-summary/', {
        params: { date },
      });
      return res.data;
    } catch {
      return null;
    }
  },

  async deleteMeal(id: number): Promise<void> {
    await apiClient.delete(`/meals/log/${id}/`);
  },

  async searchReference(query: string): Promise<MealReference[]> {
    const res = await apiClient.get<{ results: MealReference[] } | MealReference[]>('/meals/reference/', {
      params: { search: query },
    });
    const data = res.data as any;
    return Array.isArray(data) ? data : (data?.results ?? []);
  },

  async lookupBarcode(barcode: string): Promise<MealReference | null> {
    // 1. Vérifier le cache local (base Django)
    try {
      const res = await apiClient.get<MealReference>('/meals/reference/by-barcode/', {
        params: { code: barcode },
      });
      return res.data;
    } catch {
      // 404 → pas en cache
    }

    // 2. Demander au backend de fetcher Open Food Facts et mettre en cache
    try {
      const res = await apiClient.post<MealReference>('/meals/reference/from-openfood/', {
        barcode,
      });
      return res.data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status !== 404 && status !== 503) {
        console.error('[lookupBarcode] from-openfood failed for', barcode, ':', err);
      }
      return null;
    }
  },

  async searchOpenFoodFacts(query: string): Promise<OpenFoodProduct[]> {
    try {
      const res = await apiClient.get<OpenFoodProduct[]>('/meals/reference/search-openfood/', {
        params: { q: query },
      });
      return res.data;
    } catch {
      return [];
    }
  },

  async createMealFromProduct(product: OpenFoodProduct): Promise<MealReference | null> {
    if (product.barcode) {
      try {
        const res = await apiClient.post<MealReference>('/meals/reference/from-openfood/', {
          barcode: product.barcode,
        });
        return res.data;
      } catch {
        // fall through to manual creation
      }
    }
    try {
      const res = await apiClient.post<MealReference>('/meals/add-meal-ref/', {
        name: product.name,
        calories: product.calories == null ? null : Math.round(product.calories),
        glucides: product.glucides,
        proteines: product.proteines,
        lipides: product.lipides,
        link_photo: product.image_url,
        source: product.barcode ? 'openfood' : 'manual',
      });
      return res.data;
    } catch {
      return null; // produit non créable, l'appelant gère le cas null
    }
  },

  async getRangeSummary(dateFrom: string, dateTo: string): Promise<DayGlucidesData[]> {
    try {
      const res = await apiClient.get<DayGlucidesData[]>('/meals/log/range-summary/', {
        params: { date_from: dateFrom, date_to: dateTo },
      });
      return res.data;
    } catch {
      return [];
    }
  },

  async addMeal(payload: CreateUserMealPayload): Promise<UserMeal> {
    const res = await apiClient.post<UserMeal>('/meals/log/', payload);
    return res.data;
  },
};

export default mealService;
