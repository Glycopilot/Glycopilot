import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import medicationService from '../medicationService';

jest.mock('../pushService', () => ({ unregisterPushToken: jest.fn() }));

describe('medicationService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    jest.clearAllMocks();
  });

  afterEach(() => mock.restore());

  describe('search', () => {
    it('returns array of medications', async () => {
      mock.onGet(/medications\/reference/).reply(200, [
        { medication_id: 1, name: 'Doliprane', dosage: '1000 mg' },
      ]);
      const result = await medicationService.search('doliprane');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Doliprane');
    });

    it('returns empty array on error', async () => {
      mock.onGet(/medications\/reference/).reply(500);
      const result = await medicationService.search('test');
      expect(result).toEqual([]);
    });

    it('returns empty array on network error', async () => {
      mock.onGet(/medications\/reference/).networkError();
      const result = await medicationService.search('test');
      expect(result).toEqual([]);
    });
  });

  describe('list', () => {
    it('returns array from direct response', async () => {
      mock.onGet(/medications\/log\//).reply(200, [{ id: 1, display_name: 'Metformine' }]);
      const result = await medicationService.list();
      expect(result).toHaveLength(1);
    });

    it('returns array from paginated response', async () => {
      mock.onGet(/medications\/log\//).reply(200, {
        results: [{ id: 1, display_name: 'Metformine' }],
        count: 1,
      });
      const result = await medicationService.list();
      expect(result).toHaveLength(1);
    });

    it('returns empty array on error', async () => {
      mock.onGet(/medications\/log\//).reply(500);
      const result = await medicationService.list();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const payload = {
      custom_name: 'Doliprane',
      start_date: '2026-05-09',
      doses_per_day: 1,
      meal_timing: 'anytime' as const,
      schedule_times: ['08:00'],
    };

    it('returns created medication on success', async () => {
      const created = { id: 1, display_name: 'Doliprane', schedules: [] };
      mock.onPost(/medications\/log/).reply(201, created);
      const result = await medicationService.create(payload);
      expect(result).toEqual(created);
    });

    it('throws error with backend message on 400', async () => {
      mock.onPost(/medications\/log/).reply(400, {
        custom_name: ['Ce champ est obligatoire.'],
      });
      await expect(medicationService.create(payload)).rejects.toThrow(
        'custom_name: Ce champ est obligatoire.'
      );
    });

    it('throws error with non_field_errors', async () => {
      mock.onPost(/medications\/log/).reply(400, {
        non_field_errors: ['Un médicament est requis.'],
      });
      await expect(medicationService.create(payload)).rejects.toThrow(
        'Un médicament est requis.'
      );
    });

    it('throws error with string response', async () => {
      mock.onPost(/medications\/log/).reply(400, 'Erreur serveur');
      await expect(medicationService.create(payload)).rejects.toThrow('Erreur serveur');
    });

    it('throws generic error on 500', async () => {
      mock.onPost(/medications\/log/).reply(500);
      await expect(medicationService.create(payload)).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('returns updated medication', async () => {
      const updated = { id: 1, display_name: 'Doliprane updated' };
      mock.onPatch(/medications\/log\/1/).reply(200, updated);
      const result = await medicationService.update(1, { custom_name: 'Doliprane updated' });
      expect(result).toEqual(updated);
    });

    it('returns null on error', async () => {
      mock.onPatch(/medications\/log\/1/).reply(404);
      const result = await medicationService.update(1, {});
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('returns true on success', async () => {
      mock.onDelete(/medications\/log\/1/).reply(204);
      const result = await medicationService.delete(1);
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      mock.onDelete(/medications\/log\/1/).reply(404);
      const result = await medicationService.delete(1);
      expect(result).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('returns true on success', async () => {
      mock.onPatch(/medications\/log\/1/).reply(200, { statut: false });
      const result = await medicationService.deactivate(1);
      expect(result).toBe(true);
    });
  });

  describe('getToday', () => {
    it('returns today intakes', async () => {
      const intakes = [{ id: 1, status: 'pending', medication_name: 'Doliprane' }];
      mock.onGet(/medications\/log\/today/).reply(200, intakes);
      const result = await medicationService.getToday();
      expect(result).toHaveLength(1);
    });

    it('returns empty array on error', async () => {
      mock.onGet(/medications\/log\/today/).reply(500);
      const result = await medicationService.getToday();
      expect(result).toEqual([]);
    });
  });

  describe('markIntake', () => {
    it('returns updated intake on taken', async () => {
      const updated = { id: 1, status: 'taken' };
      mock.onPost(/medications\/intakes\/1\/action/).reply(200, updated);
      const result = await medicationService.markIntake(1, { action: 'taken' });
      expect(result?.status).toBe('taken');
    });

    it('returns null on error', async () => {
      mock.onPost(/medications\/intakes\/1\/action/).reply(400);
      const result = await medicationService.markIntake(1, { action: 'taken' });
      expect(result).toBeNull();
    });
  });

  describe('getIntakeHistory', () => {
    it('returns history array', async () => {
      mock.onGet(/medications\/intakes\/history/).reply(200, [
        { id: 1, status: 'taken', medication_name: 'Aspirine' },
      ]);
      const result = await medicationService.getIntakeHistory();
      expect(result).toHaveLength(1);
    });

    it('filters by medication_id when provided', async () => {
      mock.onGet(/medications\/intakes\/history/).reply(200, []);
      const result = await medicationService.getIntakeHistory(42);
      expect(result).toEqual([]);
    });

    it('returns empty on error', async () => {
      mock.onGet(/medications\/intakes\/history/).reply(500);
      const result = await medicationService.getIntakeHistory();
      expect(result).toEqual([]);
    });
  });
});
