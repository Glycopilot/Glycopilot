process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';

import MockAdapter from 'axios-mock-adapter';
import medicationService from '../medicationService';
import apiClient from '../apiClient';

const mock = new MockAdapter(apiClient);

beforeEach(() => mock.reset());
afterAll(() => mock.restore());

describe('medicationService.search', () => {
  it('returns results on success', async () => {
    const meds = [{ id: 1, name: 'Metformine' }];
    mock.onGet('/medications/reference/').reply(200, meds);
    const result = await medicationService.search('Metformine');
    expect(result).toEqual(meds);
  });

  it('returns empty array when response is not an array', async () => {
    mock.onGet('/medications/reference/').reply(200, { results: [] });
    const result = await medicationService.search('test');
    expect(result).toEqual([]);
  });

  it('returns empty array on error', async () => {
    mock.onGet('/medications/reference/').reply(500);
    const result = await medicationService.search('test');
    expect(result).toEqual([]);
  });
});

describe('medicationService.list', () => {
  it('returns list when response is array', async () => {
    const meds = [{ id: 1 }, { id: 2 }];
    mock.onGet('/medications/log/').reply(200, meds);
    const result = await medicationService.list();
    expect(result).toEqual(meds);
  });

  it('returns results from paginated response', async () => {
    const meds = [{ id: 1 }];
    mock.onGet('/medications/log/').reply(200, { results: meds });
    const result = await medicationService.list();
    expect(result).toEqual(meds);
  });

  it('returns empty array on error', async () => {
    mock.onGet('/medications/log/').reply(500);
    const result = await medicationService.list();
    expect(result).toEqual([]);
  });
});

describe('medicationService.create', () => {
  const payload = { medication_id: 1, dosage: '500mg', frequency: 'daily' } as any;

  it('creates medication and returns data', async () => {
    const created = { id: 1, ...payload };
    mock.onPost('/medications/log/').reply(201, created);
    const result = await medicationService.create(payload);
    expect(result).toEqual(created);
  });

  it('throws with field error message on failure', async () => {
    mock.onPost('/medications/log/').reply(400, { dosage: ['Invalid dosage'] });
    await expect(medicationService.create(payload)).rejects.toThrow('dosage: Invalid dosage');
  });

  it('throws with non_field_errors message', async () => {
    mock.onPost('/medications/log/').reply(400, { non_field_errors: ['Duplicate entry'] });
    await expect(medicationService.create(payload)).rejects.toThrow('Duplicate entry');
  });

  it('throws with string error', async () => {
    mock.onPost('/medications/log/').reply(400, 'Bad request');
    await expect(medicationService.create(payload)).rejects.toThrow('Bad request');
  });

  it('throws with fallback message on empty error', async () => {
    mock.onPost('/medications/log/').reply(400, {});
    await expect(medicationService.create(payload)).rejects.toThrow();
  });
});

describe('medicationService.update', () => {
  it('updates and returns data', async () => {
    const updated = { id: 1, dosage: '1000mg' };
    mock.onPatch('/medications/log/1/').reply(200, updated);
    const result = await medicationService.update(1, { dosage: '1000mg' } as any);
    expect(result).toEqual(updated);
  });

  it('returns null on error', async () => {
    mock.onPatch('/medications/log/1/').reply(500);
    const result = await medicationService.update(1, {} as any);
    expect(result).toBeNull();
  });
});

describe('medicationService.delete', () => {
  it('returns true on success', async () => {
    mock.onDelete('/medications/log/1/').reply(204);
    const result = await medicationService.delete(1);
    expect(result).toBe(true);
  });

  it('returns false on error', async () => {
    mock.onDelete('/medications/log/1/').reply(500);
    const result = await medicationService.delete(1);
    expect(result).toBe(false);
  });
});

describe('medicationService.deactivate', () => {
  it('returns true on success', async () => {
    mock.onPatch('/medications/log/1/').reply(200);
    const result = await medicationService.deactivate(1);
    expect(result).toBe(true);
  });

  it('returns false on error', async () => {
    mock.onPatch('/medications/log/99/').reply(500);
    const result = await medicationService.deactivate(99);
    expect(result).toBe(false);
  });
});

describe('medicationService.getToday', () => {
  it('returns today intakes', async () => {
    const intakes = [{ id: 1 }];
    mock.onGet('/medications/log/today/').reply(200, intakes);
    const result = await medicationService.getToday();
    expect(result).toEqual(intakes);
  });

  it('returns empty array on error', async () => {
    mock.onGet('/medications/log/today/').reply(500);
    const result = await medicationService.getToday();
    expect(result).toEqual([]);
  });
});

describe('medicationService.markIntake', () => {
  it('marks intake and returns data', async () => {
    const intake = { id: 1, status: 'taken' };
    mock.onPost('/medications/intakes/1/action/').reply(200, intake);
    const result = await medicationService.markIntake(1, { action: 'taken' } as any);
    expect(result).toEqual(intake);
  });

  it('returns null on error', async () => {
    mock.onPost('/medications/intakes/1/action/').reply(500);
    const result = await medicationService.markIntake(1, { action: 'taken' } as any);
    expect(result).toBeNull();
  });
});

describe('medicationService.getIntakeHistory', () => {
  it('returns history without filter', async () => {
    const history = [{ id: 1 }];
    mock.onGet('/medications/intakes/history/').reply(200, history);
    const result = await medicationService.getIntakeHistory();
    expect(result).toEqual(history);
  });

  it('returns history with medicationId filter', async () => {
    const history = [{ id: 2 }];
    mock.onGet('/medications/intakes/history/').reply(200, history);
    const result = await medicationService.getIntakeHistory(42);
    expect(result).toEqual(history);
  });

  it('returns empty array on error', async () => {
    mock.onGet('/medications/intakes/history/').reply(500);
    const result = await medicationService.getIntakeHistory();
    expect(result).toEqual([]);
  });
});
