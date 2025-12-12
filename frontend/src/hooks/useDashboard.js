import { useState, useEffect, useCallback, useRef } from 'react';
import dashboardService from '../services/dashboardService';

/**
 * Hook personnalisé pour gérer le dashboard
 * @param {Object} options - Options de configuration
 * @param {Array<string>} options.modules - Modules à charger (glucose, alerts, medication, nutrition, activity)
 * @param {number} options.refreshInterval - Intervalle de rafraîchissement automatique en ms (0 = désactivé)
 * @param {boolean} options.autoLoad - Charger automatiquement au montage
 * @returns {Object} État et méthodes du dashboard
 */
export const useDashboard = (options = {}) => {
  const { modules = null, refreshInterval = 0, autoLoad = true } = options;

  // États
  const [summary, setSummary] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Références pour le cleanup
  const refreshIntervalRef = useRef(null);
  const isMountedRef = useRef(true);

  /**
   * Charge le résumé du dashboard
   */
  const loadSummary = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError('');

      try {
        const data = await dashboardService.getSummary(modules);
        if (isMountedRef.current) {
          setSummary(data);
        }
        return data;
      } catch (err) {
        if (isMountedRef.current) {
          setError(err.message);
        }
        throw err;
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [modules]
  );

  /**
   * Charge les widgets
   */
  const loadWidgets = useCallback(async () => {
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
        setError(err.message);
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
  const loadLayouts = useCallback(async () => {
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
        setError(err.message);
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
  const updateLayout = useCallback(async newLayout => {
    setLoading(true);
    setError('');

    try {
      const result = await dashboardService.updateWidgetLayout(newLayout);
      if (isMountedRef.current) {
        // Mettre à jour les layouts localement
        setLayouts(result.layout);
      }
      return result;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
      }
      throw err;
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Rafraîchit toutes les données
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');

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
      }

      return {
        summary: summaryData,
        widgets: widgetsData,
        layouts: layoutsData,
      };
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
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
  const loadModuleData = useCallback(async moduleName => {
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
        // Mettre à jour uniquement le module concerné dans le summary
        setSummary(prev => ({
          ...prev,
          [moduleName]: data,
        }));
      }

      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message);
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
    widgetId => {
      return widgets.find(w => w.widgetId === widgetId);
    },
    [widgets]
  );

  /**
   * Obtenir le layout d'un widget spécifique
   */
  const getWidgetLayout = useCallback(
    widgetId => {
      return layouts.find(l => l.widgetId === widgetId);
    },
    [layouts]
  );

  /**
   * Vérifier si un widget est visible
   */
  const isWidgetVisible = useCallback(
    widgetId => {
      const widget = getWidget(widgetId);
      return widget ? widget.visible : false;
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
        loadSummary(false);
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [refreshInterval, loadSummary]);

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

    // Données dérivées
    glucose: summary?.glucose,
    alerts: summary?.alerts || [],
    medication: summary?.medication,
    nutrition: summary?.nutrition,
    activity: summary?.activity,
    healthScore: summary?.healthScore,
  };
};

export default useDashboard;
