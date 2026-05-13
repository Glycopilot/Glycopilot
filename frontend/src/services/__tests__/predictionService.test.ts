process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';

import MockAdapter from 'axios-mock-adapter';
import predictionService from '../predictionService';
import apiClient from '../apiClient';

const mock = new MockAdapter(apiClient);

beforeEach(() => mock.reset());
afterAll(() => mock.restore());

describe('predictionService.getLatest', () => {
  it('returns latest prediction on success', async () => {
    const payload = { id: 'p1', status: 'ok', source: 'ensemble' };
    mock.onGet('/glycemia/predictions/latest/').reply(200, payload);

    const result = await predictionService.getLatest();
    expect(result).toEqual(payload);
  });

  it('returns null on error', async () => {
    mock.onGet('/glycemia/predictions/latest/').reply(500);

    const result = await predictionService.getLatest();
    expect(result).toBeNull();
  });
});

describe('predictionService.getHistory', () => {
  it('returns array payload directly', async () => {
    const payload = [{ id: 'p1' }, { id: 'p2' }];
    mock.onGet('/glycemia/predictions/').reply(200, payload);

    const result = await predictionService.getHistory(2);
    expect(result).toEqual(payload);
  });

  it('returns results from paginated payload', async () => {
    const payload = { results: [{ id: 'p3' }] };
    mock.onGet('/glycemia/predictions/').reply(200, payload);

    const result = await predictionService.getHistory();
    expect(result).toEqual(payload.results);
  });

  it('returns empty array on error', async () => {
    mock.onGet('/glycemia/predictions/').reply(500);

    const result = await predictionService.getHistory();
    expect(result).toEqual([]);
  });
});
