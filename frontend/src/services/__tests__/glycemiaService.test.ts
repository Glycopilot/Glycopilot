import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import glycemiaService from '../glycemiaService';
import { GlycemiaEntry } from '../../types/glycemia.types';

describe('glycemiaService', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
    });

    describe('getCurrent', () => {
        it('should return current glycemia entry on success', async () => {
            const mockEntry: GlycemiaEntry = { id: '1', value: 110, measured_at: '2023-01-01T10:00:00Z', context: 'fasting', source: 'manual' };
            mock.onGet('/glycemia/current/').reply(200, mockEntry);

            const result = await glycemiaService.getCurrent();

            expect(result).toEqual(mockEntry);
        });

        it('should return null on error', async () => {
            mock.onGet('/glycemia/current/').reply(500);

            const result = await glycemiaService.getCurrent();

            expect(result).toBeNull();
        });
    });

    describe('getHistory', () => {
        it('should fetch history with correct days for period', async () => {
            const mockEntries = [{ id: '1', value: 100, measured_at: '2023-01-01T10:00:00Z' }];
            mock.onGet('/glycemia/range/').reply(200, { entries: mockEntries });

            const result = await glycemiaService.getHistory({ period: 'month' });

            expect(result).toEqual(mockEntries);
            expect(mock.history.get[0].params).toEqual({ days: 30 });
        });

        it('should return empty array on failure', async () => {
            mock.onGet('/glycemia/range/').reply(404);

            const result = await glycemiaService.getHistory();

            expect(result).toEqual([]);
        });
    });

    describe('createManualReading', () => {
        it('should create a reading on success', async () => {
            const data = { value: 120, measured_at: '2023-01-01T12:00:00Z', context: 'preprandial' as const };
            const mockResponse = { ...data, id: '123' };
            mock.onPost('/glycemia/manual-readings/').reply(201, mockResponse);

            const result = await glycemiaService.createManualReading(data);

            expect(result).toEqual(mockResponse);
        });

        it('should return null on error', async () => {
            mock.onPost('/glycemia/manual-readings/').reply(400);

            const result = await glycemiaService.createManualReading({ value: 0, measured_at: '' });

            expect(result).toBeNull();
        });
    });

    describe('transformForChart', () => {
        it('should return default data when history is empty', () => {
            const result = glycemiaService.transformForChart([]);
            expect(result.labels).toEqual(['--']);
            expect(result.datasets[0].data).toEqual([100]);
        });

        it('should transform day history correctly', () => {
            const d1 = new Date(2023, 0, 1, 8, 0, 0);
            const d2 = new Date(2023, 0, 1, 9, 0, 0);
            const history: GlycemiaEntry[] = [
                { id: '1', value: 100, measured_at: d1.toISOString(), source: 'manual' },
                { id: '2', value: 110, measured_at: d2.toISOString(), source: 'manual' }
            ];
            const result = glycemiaService.transformForChart(history, 'day');

            expect(result.labels).toEqual(['8h', '9h']);
            expect(result.datasets[0].data).toEqual([100, 110]);
        });

        it('should transform week history with sampling', () => {
            const history: GlycemiaEntry[] = Array.from({ length: 14 }, (_, i) => ({
                id: i.toString(),
                value: 100 + i,
                measured_at: new Date(2023, 0, i + 1).toISOString(),
                source: 'manual'
            }));
            const result = glycemiaService.transformForChart(history, 'week');

            expect(result.labels.length).toBeLessThanOrEqual(10);
            expect(result.datasets[0].data.length).toBeLessThanOrEqual(10);
        });

        it('should sort history before transforming', () => {
            const d1 = new Date(2023, 0, 1, 8, 0, 0);
            const d2 = new Date(2023, 0, 1, 9, 0, 0);
            const history: GlycemiaEntry[] = [
                { id: '2', value: 110, measured_at: d2.toISOString(), source: 'manual' },
                { id: '1', value: 100, measured_at: d1.toISOString(), source: 'manual' }
            ];
            const result = glycemiaService.transformForChart(history, 'day');

            expect(result.labels).toEqual(['8h', '9h']);
            expect(result.datasets[0].data).toEqual([100, 110]);
        });
    });
});
