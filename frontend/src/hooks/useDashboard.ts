import { useState, useEffect, useCallback, useRef } from 'react';
import dashboardService from '../services/dashboardService';
import type {
  DashboardSummary,
  DashboardWidget,
  DashboardLayout,
  DashboardModule,
  DashboardGlucoseData,
  DashboardAlert,
  DashboardMedicationData,
  DashboardNutritionData,
  DashboardActivityData,
} from '../types/dashboard.types';

interface UseDashboardOptions {
  modules?: DashboardModule[] | null;
  refreshInterval?: number;
  autoLoad?: boolean;
}

interface UseDashboardReturn {
  // États
  summary: DashboardSummary | null;
  widgets: DashboardWidget[];
  layouts: DashboardLayout[];
  loading: boolean;
  refreshing: boolean;
  error: string;

  // Méthodes
  loadSummary: (showLoading?: boolean) => Promise<DashboardSummary>;
  loadWidgets: () => Promise<DashboardWidget[]>;
  loadLayouts: () => Promise<DashboardLayout[]>;
  updateLayout: (newLayout: DashboardLayout[]) => Promise<DashboardLayout[]>;
  refresh: () => Promise<{
    summary: DashboardSummary;
    widgets: DashboardWidget[];
    layouts: DashboardLayout[];
  }>;
  loadModuleData: (
    moduleName: DashboardModule
  ) => Promise<
    | DashboardGlucoseData
    | DashboardAlert[]
    | DashboardMedicationData
    | DashboardNutritionData
    | DashboardActivityData
  >;
  getWidget: (widgetId: string) => DashboardWidget | undefined;
  getWidgetLayout: (widgetId: string) => DashboardLayout | undefined;
  isWidgetVisible: (widgetId: string) => boolean;

  // Données dérivées
  glucose?: DashboardGlucoseData;
  alerts: DashboardAlert[];
  medication?: DashboardMedicationData;
  nutrition?: DashboardNutritionData;
  activity?: DashboardActivityData;
  healthScore?: number;
}

/**
 * Hook personnalisé pour gérer le dashboard
 */
export const useDashboard = (
  options: UseDashboardOptions = {}
): UseDashboardReturn => {
  const { modules = null, refreshInterval = 0, autoLoad = true } = options;

  // États
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Références pour le cleanup
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const isMountedRef = useRef(true);

  const withLoading = useCallback(
    async <T>(fn: () => Promise<T>, onSuccess?: (data: T) => void): Promise<T> => {
      setLoading(true);
      setError('');
      try {
        const data = await fn();
        if (isMountedRef.current && onSuccess) {
          onSuccess(data);
        }
        return data;
      } catch (err) {
        if (isMountedRef.current) {
          setError((err as Error).message);
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  const loadSummary = useCallback(
    async (showLoading = true): Promise<DashboardSummary> => {
      if (showLoading) {
        setLoading(true);
        setError('');
      }
      try {
        const data = await dashboardService.getSummary(modules);
        if (isMountedRef.current) {
          setSummary(data);
          setError('');
        }
        return data;
      } catch (err) {
        if (isMountedRef.current && showLoading) {
          setError((err as Error).message);
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [modules]
  );

  const loadWidgets = useCallback(
    () => withLoading(() => dashboardService.getWidgets(), data => setWidgets(data)),
    [withLoading]
  );

  const loadLayouts = useCallback(
    () => withLoading(() => dashboardService.getWidgetLayouts(), data => setLayouts(data)),
    [withLoading]
  );

  const updateLayout = useCallback(
    (newLayout: DashboardLayout[]) =>
      withLoading(() => dashboardService.updateWidgetLayout(newLayout), data => setLayouts(data)),
    [withLoading]
  );

  /**
   * Rafraîchit toutes les données
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      const [summaryData, widgetsData, layoutsData] = await Promise.all([
        dashboardService.getSummary(modules),
        dashboardService.getWidgets(),
        dashboardService.getWidgetLayouts(),
      ]);

      if (isMountedRef.current) {
        setSummary(summaryData);
        setWidgets(widgetsData);
        setLayouts(layoutsData);
        setError('');
      }

      return {
        summary: summaryData,
        widgets: widgetsData,
        layouts: layoutsData,
      };
    } catch (err) {
      if (isMountedRef.current) {
        setError((err as Error).message);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [modules]);

  const loadModuleData = useCallback(
    (moduleName: DashboardModule) => {
      const fetchModule = async () => {
        switch (moduleName) {
          case 'glucose': return dashboardService.getGlucoseData();
          case 'alerts': return dashboardService.getAlerts();
          case 'medication': return dashboardService.getMedicationData();
          case 'nutrition': return dashboardService.getNutritionData();
          case 'activity': return dashboardService.getActivityData();
          default: throw new Error(`Module inconnu: ${moduleName}`);
        }
      };
      return withLoading(fetchModule, data =>
        setSummary(prev => ({ ...prev, [moduleName]: data }))
      );
    },
    [withLoading]
  );

  /**
   * Obtenir un widget spécifique par ID
   */
  const getWidget = useCallback(
    (widgetId: string): DashboardWidget | undefined => {
      return widgets.find(w => w.id === widgetId);
    },
    [widgets]
  );

  /**
   * Obtenir le layout d'un widget spécifique
   */
  const getWidgetLayout = useCallback(
    (widgetId: string): DashboardLayout | undefined => {
      return layouts.find(l => l.widget_id === widgetId);
    },
    [layouts]
  );

  /**
   * Vérifier si un widget est visible
   */
  const isWidgetVisible = useCallback(
    (widgetId: string): boolean => {
      const widget = getWidget(widgetId);
      return widget ? widget.enabled : false;
    },
    [getWidget]
  );

  // Chargement initial
  useEffect(() => {
    if (autoLoad) {
      loadSummary();
      loadWidgets();
      loadLayouts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad]);

  // Rafraîchissement automatique
  useEffect(() => {
    if (refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        loadSummary(false).catch(() => {
          // Ignore les erreurs en arrière-plan
        });
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshInterval]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    // États
    summary,
    widgets,
    layouts,
    loading,
    refreshing,
    error,

    // Méthodes
    loadSummary,
    loadWidgets,
    loadLayouts,
    updateLayout,
    refresh,
    loadModuleData,
    getWidget,
    getWidgetLayout,
    isWidgetVisible,

    // Données dérivées avec fallback
    glucose: summary?.glucose,
    alerts: summary?.alerts || [],
    medication: summary?.medication || {
      taken_count: 0,
      total_count: 0,
      nextDose: null,
    },
    nutrition: summary?.nutrition || {
      calories: { consumed: 0, goal: 1800 },
      carbs: { grams: 0, goal: 200 },
    },
    activity: summary?.activity || {
      steps: { value: 0, goal: 8000 },
      activeMinutes: 0,
    },
    healthScore: summary?.healthScore,
  };
};

export default useDashboard;
