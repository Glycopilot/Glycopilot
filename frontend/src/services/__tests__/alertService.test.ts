import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import alertService from '../alertService';

describe('alertService', () => {
    let mock: MockAdapter;

    beforeEach(() => {
        mock = new MockAdapter(apiClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        mock.restore();
    });

    describe('getHistory', () => {
        it('should return alert events on success', async () => {
            const mockAlerts = [
                { id: 1, type: 'HYPO', status: 'PENDING', message: 'Hypoglycemia detected' },
                { id: 2, type: 'HYPER', status: 'ACKED', message: 'Hyperglycemia detected' }
            ];

            mock.onGet('/alerts/events/').reply(200, { results: mockAlerts });

            const result = await alertService.getHistory();

            expect(result).toEqual(mockAlerts);
        });

        it('should return empty array on 404 or other error', async () => {
            mock.onGet('/alerts/events/').reply(404);

            const result = await alertService.getHistory();

            expect(result).toEqual([]);
        });

        it('should return empty array if results is missing in response', async () => {
            mock.onGet('/alerts/events/').reply(200, {});

            const result = await alertService.getHistory();

            expect(result).toEqual([]);
        });
    });

    describe('ackAlert', () => {
        it('should return true on successful acknowledgment', async () => {
            mock.onPost('/alerts/events/ack/').reply(200);

            const result = await alertService.ackAlert(123);

            expect(result).toBe(true);
            expect(JSON.parse(mock.history.post[0].data)).toEqual({ event_id: 123 });
        });

        it('should return false on failure', async () => {
            mock.onPost('/alerts/events/ack/').reply(500);

            const result = await alertService.ackAlert(123);

            expect(result).toBe(false);
        });
    });
});
