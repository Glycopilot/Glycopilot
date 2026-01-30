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

  /**
   * Charge le résumé du dashboard
   */
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

  /**
   * Charge les widgets
   */
  const loadWidgets = useCallback(async (): Promise<DashboardWidget[]> => {
    setLoading(true);
    setError('');

    try {
      const data = await dashboardService.getWidgets();
      if (isMountedRef.current) {
        setWidgets(data);
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
  }, []);

  /**
   * Charge les layouts des widgets
   */
  const loadLayouts = useCallback(async (): Promise<DashboardLayout[]> => {
    setLoading(true);
    setError('');

    try {
      const data = await dashboardService.getWidgetLayouts();
      if (isMountedRef.current) {
        setLayouts(data);
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
  }, []);

  /**
   * Met à jour le layout des widgets
   */
  const updateLayout = useCallback(
    async (newLayout: DashboardLayout[]): Promise<DashboardLayout[]> => {
      setLoading(true);
      setError('');

      try {
        const result = await dashboardService.updateWidgetLayout(newLayout);
        if (isMountedRef.current) {
          setLayouts(result);
        }
        return result;
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

  /**
   * Charge les données spécifiques d'un module
   */
  const loadModuleData = useCallback(async (moduleName: DashboardModule) => {
    setLoading(true);
    setError('');

    try {
      let data;
      switch (moduleName) {
        case 'glucose':
          data = await dashboardService.getGlucoseData();
          break;
        case 'alerts':
          data = await dashboardService.getAlerts();
          break;
        case 'medication':
          data = await dashboardService.getMedicationData();
          break;
        case 'nutrition':
          data = await dashboardService.getNutritionData();
          break;
        case 'activity':
          data = await dashboardService.getActivityData();
          break;
        default:
          throw new Error(`Module inconnu: ${moduleName}`);
      }

      if (isMountedRef.current) {
        setSummary(prev => ({
          ...prev,
          [moduleName]: data,
        }));
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
  }, []);

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

    // Données dérivées avec fallback vers mock
    glucose: summary?.glucose,
    alerts: summary?.alerts || [],
    medication: summary?.medication || { taken_count: 0, total_count: 0 },
    nutrition: summary?.nutrition,
    activity: summary?.activity || { today_count: 0 },
  };
};

export default useDashboard;
