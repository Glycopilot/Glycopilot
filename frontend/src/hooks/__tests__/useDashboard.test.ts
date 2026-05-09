import { renderHook, act, waitFor } from '@testing-library/react-native';
import useDashboard from '../useDashboard';
import dashboardService from '../../services/dashboardService';
import { mockDashboardSummary, mockWidgets, mockLayouts } from '../../data/mockData';

// Mock dashboardService
jest.mock('../../services/dashboardService', () => ({
    getSummary: jest.fn(),
    getWidgets: jest.fn(),
    getWidgetLayouts: jest.fn(),
    updateWidgetLayout: jest.fn(),
    getGlucoseData: jest.fn(),
    getAlerts: jest.fn(),
    getMedicationData: jest.fn(),
    getNutritionData: jest.fn(),
    getActivityData: jest.fn(),
}));

describe('useDashboard hook', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (dashboardService.getSummary as jest.Mock).mockResolvedValue(mockDashboardSummary);
        (dashboardService.getWidgets as jest.Mock).mockResolvedValue(mockWidgets);
        (dashboardService.getWidgetLayouts as jest.Mock).mockResolvedValue(mockLayouts);
    });

    it('should load all data on mount if autoLoad is true', async () => {
        const { result } = renderHook(() => useDashboard({ autoLoad: true }));

        expect(result.current.loading).toBe(true);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.summary).toEqual(mockDashboardSummary);
        expect(result.current.widgets).toEqual(mockWidgets);
        expect(result.current.layouts).toEqual(mockLayouts);
    });

    it('should NOT load data on mount if autoLoad is false', () => {
        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        expect(result.current.loading).toBe(false);
        expect(dashboardService.getSummary).not.toHaveBeenCalled();
    });

    it('should handle refresh correctly', async () => {
        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        await act(async () => {
            await result.current.refresh();
        });

        expect(result.current.refreshing).toBe(false);
        expect(dashboardService.getSummary).toHaveBeenCalled();
        expect(dashboardService.getWidgets).toHaveBeenCalled();
        expect(dashboardService.getWidgetLayouts).toHaveBeenCalled();
    });

    it('should handle updateLayout', async () => {
        const newLayout = [...mockLayouts];
        (dashboardService.updateWidgetLayout as jest.Mock).mockResolvedValue(newLayout);

        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        await act(async () => {
            await result.current.updateLayout(newLayout);
        });

        expect(result.current.layouts).toEqual(newLayout);
        expect(dashboardService.updateWidgetLayout).toHaveBeenCalledWith(newLayout);
    });

    it('should load specific module data', async () => {
        const glucoseData = { value: 150, recordedAt: 'now' };
        (dashboardService.getGlucoseData as jest.Mock).mockResolvedValue(glucoseData);

        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        await act(async () => {
            const data = await result.current.loadModuleData('glucose');
            expect(data).toEqual(glucoseData);
        });

        expect(result.current.summary?.glucose).toEqual(glucoseData);
    });

    describe('helper methods', () => {
        it('getWidget should find widget by id', async () => {
            const { result } = renderHook(() => useDashboard({ autoLoad: true }));
            await waitFor(() => expect(result.current.loading).toBe(false));

            const widget = result.current.getWidget('glucose-card');
            expect(widget?.type).toBe('glucose');
        });

        it('isWidgetVisible should return enabled status', async () => {
            const { result } = renderHook(() => useDashboard({ autoLoad: true }));
            await waitFor(() => expect(result.current.loading).toBe(false));

            expect(result.current.isWidgetVisible('glucose-card')).toBe(true);
        });
    });

    it('should handle errors during loadSummary', async () => {
        (dashboardService.getSummary as jest.Mock).mockRejectedValue(new Error('Load error'));

        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        await act(async () => {
            try {
                await result.current.loadSummary();
            } catch (e) {
                // Expected throw
            }
        });

        expect(result.current.error).toBe('Load error');
    });

    it('should load alerts module data', async () => {
        const alertsData = [{ id: '1', type: 'hypo' }];
        (dashboardService.getAlerts as jest.Mock).mockResolvedValue(alertsData);

        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        await act(async () => {
            await result.current.loadModuleData('alerts');
        });

        expect(dashboardService.getAlerts).toHaveBeenCalled();
    });

    it('should load medication module data', async () => {
        const medicationData = { taken_count: 1, total_count: 2, nextDose: null };
        (dashboardService.getMedicationData as jest.Mock).mockResolvedValue(medicationData);

        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        await act(async () => {
            await result.current.loadModuleData('medication');
        });

        expect(dashboardService.getMedicationData).toHaveBeenCalled();
    });

    it('should load nutrition module data', async () => {
        (dashboardService.getNutritionData as jest.Mock).mockResolvedValue({});

        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        await act(async () => {
            await result.current.loadModuleData('nutrition');
        });

        expect(dashboardService.getNutritionData).toHaveBeenCalled();
    });

    it('should load activity module data', async () => {
        (dashboardService.getActivityData as jest.Mock).mockResolvedValue({});

        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        await act(async () => {
            await result.current.loadModuleData('activity');
        });

        expect(dashboardService.getActivityData).toHaveBeenCalled();
    });

    it('should handle refresh error', async () => {
        (dashboardService.getSummary as jest.Mock).mockRejectedValue(new Error('Refresh error'));

        const { result } = renderHook(() => useDashboard({ autoLoad: false }));

        await act(async () => {
            try {
                await result.current.refresh();
            } catch {
                // Expected
            }
        });

        expect(result.current.error).toBe('Refresh error');
    });

    it('should trigger auto-refresh with refreshInterval', async () => {
        jest.useFakeTimers();
        (dashboardService.getSummary as jest.Mock).mockResolvedValue(mockDashboardSummary);
        (dashboardService.getWidgets as jest.Mock).mockResolvedValue(mockWidgets);
        (dashboardService.getWidgetLayouts as jest.Mock).mockResolvedValue(mockLayouts);

        renderHook(() => useDashboard({ autoLoad: false, refreshInterval: 1000 }));

        act(() => { jest.advanceTimersByTime(1000); });

        await waitFor(() => {
            expect(dashboardService.getSummary).toHaveBeenCalled();
        });

        jest.useRealTimers();
    });
});
