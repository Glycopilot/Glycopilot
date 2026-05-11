process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';

import MockAdapter from 'axios-mock-adapter';
import predictionService from '../predictionService';
import apiClient from '../apiClient';

const mock = new MockAdapter(apiClient);

beforeEach(() => mock.reset());
afterAll(() => mock.restore());

const mockPrediction = {
  id: '1',
  for_time: new Date().toISOString(),
  created_at: new Date().toISOString(),
  source: 'ensemble',
  status: 'ok',
  confidence: 0.85,
  y_hat_15: 5.5,
};

describe('predictionService.getLatest', () => {
  it('returns prediction on success', async () => {
    mock.onGet('/glycemia/predictions/latest/').reply(200, mockPrediction);
    const result = await predictionService.getLatest();
    expect(result).toEqual(mockPrediction);
  });

  it('returns null on error', async () => {
    mock.onGet('/glycemia/predictions/latest/').reply(404);
    const result = await predictionService.getLatest();
    expect(result).toBeNull();
  });

  it('returns null on 500 error', async () => {
    mock.onGet('/glycemia/predictions/latest/').reply(500);
    const result = await predictionService.getLatest();
    expect(result).toBeNull();
  });
});

describe('predictionService.getHistory', () => {
  it('returns array response directly', async () => {
    const predictions = [mockPrediction];
    mock.onGet('/glycemia/predictions/').reply(200, predictions);
    const result = await predictionService.getHistory();
    expect(result).toEqual(predictions);
  });

  it('returns results from paginated response', async () => {
    mock.onGet('/glycemia/predictions/').reply(200, { results: [mockPrediction] });
    const result = await predictionService.getHistory();
    expect(result).toEqual([mockPrediction]);
  });

  it('returns empty array when results is null/missing', async () => {
    mock.onGet('/glycemia/predictions/').reply(200, { results: null });
    const result = await predictionService.getHistory();
    expect(result).toEqual([]);
  });

  it('returns empty array on error', async () => {
    mock.onGet('/glycemia/predictions/').reply(500);
    const result = await predictionService.getHistory();
    expect(result).toEqual([]);
  });

  it('passes limit parameter', async () => {
    mock.onGet('/glycemia/predictions/').reply(200, []);
    const result = await predictionService.getHistory(10);
    expect(result).toEqual([]);
  });
});
