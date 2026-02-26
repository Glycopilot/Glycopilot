import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import dashboardService from '../dashboardService';
import { mockDashboardSummary, mockWidgets, mockLayouts } from '../../data/mockData';

describe('dashboardService', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
    });

    describe('getSummary', () => {
        it('should return summary from API on success', async () => {
            const mockData = { ...mockDashboardSummary, glucose: { value: 120, recordedAt: '2023-01-01T12:00:00Z' } };
            mock.onGet('/v1/dashboard/summary').reply(200, mockData);

            const result = await dashboardService.getSummary();

            expect(result).toEqual(mockData);
        });

        it('should handle modules parameter correctly', async () => {
            mock.onGet('/v1/dashboard/summary?include[]=glucose&include[]=alerts').reply(200, mockDashboardSummary);

            const result = await dashboardService.getSummary(['glucose', 'alerts']);

            expect(result).toEqual(mockDashboardSummary);
        });

        it('should return mock data on error', async () => {
            mock.onGet('/v1/dashboard/summary').reply(500);

            const result = await dashboardService.getSummary();

            expect(result).toEqual(mockDashboardSummary);
        });
    });

    describe('getWidgets', () => {
        it('should return widgets from API on success', async () => {
            mock.onGet('/v1/dashboard/widgets').reply(200, { widgets: mockWidgets });

            const result = await dashboardService.getWidgets();

            expect(result).toEqual(mockWidgets);
        });

        it('should return mock widgets on error', async () => {
            mock.onGet('/v1/dashboard/widgets').reply(404);

            const result = await dashboardService.getWidgets();

            expect(result).toEqual(mockWidgets);
        });
    });

    describe('getWidgetLayouts', () => {
        it('should return layouts from API on success', async () => {
            mock.onGet('/v1/dashboard/widgets/layout').reply(200, { layout: mockLayouts });

            const result = await dashboardService.getWidgetLayouts();

            expect(result).toEqual(mockLayouts);
        });

        it('should return mock layouts on error', async () => {
            mock.onGet('/v1/dashboard/widgets/layout').reply(500);

            const result = await dashboardService.getWidgetLayouts();

            expect(result).toEqual(mockLayouts);
        });
    });

    describe('updateWidgetLayout', () => {
        it('should update layout on success', async () => {
            mock.onPatch('/v1/dashboard/widgets/layout').reply(200, { layout: mockLayouts });

            const result = await dashboardService.updateWidgetLayout(mockLayouts);

            expect(result).toEqual(mockLayouts);
            expect(JSON.parse(mock.history.patch[0].data)).toEqual({ layout: mockLayouts });
        });

        it('should return original layouts on error', async () => {
            mock.onPatch('/v1/dashboard/widgets/layout').reply(500);

            const result = await dashboardService.updateWidgetLayout(mockLayouts);

            expect(result).toEqual(mockLayouts);
        });
    });

    describe('Glucose, Alerts, Medication, Nutrition, Activity helpers', () => {
        it('getGlucoseData should return data from summary', async () => {
            const glucose = { value: 150, recordedAt: 'now' };
            jest.spyOn(dashboardService, 'getSummary').mockResolvedValue({ ...mockDashboardSummary, glucose });

            const result = await dashboardService.getGlucoseData();

            expect(result).toEqual(glucose);
        });

        it('getAlerts should return alerts from summary', async () => {
            const alerts = [{ alertId: '1', type: 'hyper' as const, severity: 'high' as const }];
            jest.spyOn(dashboardService, 'getSummary').mockResolvedValue({ ...mockDashboardSummary, alerts });

            const result = await dashboardService.getAlerts();

            expect(result).toEqual(alerts);
        });

        it('getMedicationData should return medication from summary', async () => {
            const medication = { taken_count: 5, total_count: 10, nextDose: { name: 'Test', scheduledAt: 'tomorrow', status: 'pending' } };
            jest.spyOn(dashboardService, 'getSummary').mockResolvedValue({ ...mockDashboardSummary, medication });

            const result = await dashboardService.getMedicationData();

            expect(result).toEqual(medication);
        });

        it('getNutritionData should return nutrition from summary', async () => {
            const nutrition = { calories: { consumed: 1000, goal: 2000 }, carbs: { grams: 100, goal: 200 } };
            jest.spyOn(dashboardService, 'getSummary').mockResolvedValue({ ...mockDashboardSummary, nutrition });

            const result = await dashboardService.getNutritionData();

            expect(result).toEqual(nutrition);
        });

        it('getActivityData should return activity from summary', async () => {
            const activity = { steps: { value: 5000, goal: 10000 }, activeMinutes: 30 };
            jest.spyOn(dashboardService, 'getSummary').mockResolvedValue({ ...mockDashboardSummary, activity });

            const result = await dashboardService.getActivityData();

            expect(result).toEqual(activity);
        });
    });

    describe('getGlucoseHistory', () => {
        it('should fetch history with correct params', async () => {
            mock.onGet(/\/v1\/glucose\/history/).reply(200, [{ value: 100 }]);

            const params = { start: '2023-01-01', end: '2023-01-02', limit: 10 };
            const result = await dashboardService.getGlucoseHistory(params);

            expect(result).toEqual([{ value: 100 }]);
            const url = mock.history.get[0].url;
            expect(url).toContain('start=2023-01-01');
            expect(url).toContain('end=2023-01-02');
            expect(url).toContain('limit=10');
        });

        it('should return empty array on error', async () => {
            mock.onGet(/\/v1\/glucose\/history/).reply(500);

            const result = await dashboardService.getGlucoseHistory();

            expect(result).toEqual([]);
        });
    });
});
