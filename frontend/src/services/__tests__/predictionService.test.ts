import MockAdapter from 'axios-mock-adapter';

import apiClient from '../apiClient';
import predictionService, { GlycemiaPrediction } from '../predictionService';

describe('predictionService', () => {
  let mock: MockAdapter;

  const prediction: GlycemiaPrediction = {
    id: 'pred-1',
    for_time: '2026-05-14T12:00:00Z',
    created_at: '2026-05-14T12:00:02Z',
    model_version: 'v1.0',
    source: 'baseline',
    status: 'ok',
    confidence: 0.85,
    input_readings_count: 12,
    y_hat_15: 110,
    p10_15: 100,
    p90_15: 120,
    risk_hypo_15: 0,
    risk_hyper_15: 0.1,
    y_hat_30: 118,
    p10_30: 105,
    p90_30: 132,
    risk_hypo_30: 0,
    risk_hyper_30: 0.2,
    y_hat_60: 130,
    p10_60: 112,
    p90_60: 145,
    risk_hypo_60: 0,
    risk_hyper_60: 0.3,
    recommendation: 'Surveiller dans 15 minutes',
  };

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
  });

  it('returns the latest prediction on success', async () => {
    mock.onGet('/glycemia/predictions/latest/').reply(200, prediction);

    await expect(predictionService.getLatest()).resolves.toEqual(prediction);
  });

  it('returns null when latest prediction request fails', async () => {
    mock.onGet('/glycemia/predictions/latest/').reply(500);

    await expect(predictionService.getLatest()).resolves.toBeNull();
  });

  it('returns paginated history results and sends default filters', async () => {
    mock
      .onGet('/glycemia/predictions/')
      .reply(200, { results: [prediction] });

    await expect(predictionService.getHistory()).resolves.toEqual([prediction]);
    expect(mock.history.get[0].params).toEqual({ limit: 5, status: 'ok' });
  });

  it('returns array history responses directly with custom limit', async () => {
    mock.onGet('/glycemia/predictions/').reply(200, [prediction]);

    await expect(predictionService.getHistory(2)).resolves.toEqual([prediction]);
    expect(mock.history.get[0].params).toEqual({ limit: 2, status: 'ok' });
  });

  it('returns an empty array when history request fails', async () => {
    mock.onGet('/glycemia/predictions/').reply(404);

    await expect(predictionService.getHistory()).resolves.toEqual([]);
  });
});
