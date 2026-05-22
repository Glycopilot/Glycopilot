process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000/api';

import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import activityService from '../activityService';

describe('activityService', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  const referenceActivity = {
    activity_id: 1,
    name: 'Course à pied',
    recommended_duration: 30,
    calories_burned: 600,
    sugar_used: 5.0,
    link_photo: null,
  };

  const userActivity = {
    id: 1,
    activity: 1,
    activity_details: referenceActivity,
    start: '2026-05-22T08:00:00Z',
    end: '2026-05-22T08:30:00Z',
    duration_minutes: 30,
    intensity: 'Modérée',
    steps: 3200,
    total_calories_burned: 300,
    total_sugar_used: 2.5,
  };

  describe('getReferenceActivities', () => {
    it('retourne la liste des activités de référence', async () => {
      mock.onGet(/\/activities\/reference\//).reply(200, [referenceActivity]);
      const result = await activityService.getReferenceActivities();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Course à pied');
      expect(result[0].calories_burned).toBe(600);
    });

    it('retourne un tableau vide en cas d\'erreur serveur', async () => {
      mock.onGet(/\/activities\/reference\//).reply(500);
      const result = await activityService.getReferenceActivities();
      expect(result).toEqual([]);
    });

    it('retourne un tableau vide en cas d\'erreur réseau', async () => {
      mock.onGet(/\/activities\/reference\//).networkError();
      const result = await activityService.getReferenceActivities();
      expect(result).toEqual([]);
    });
  });

  describe('getUserActivities', () => {
    it('retourne les activités de l\'utilisateur', async () => {
      mock.onGet(/\/activities\/log\//).reply(200, [userActivity]);
      const result = await activityService.getUserActivities();
      expect(result).toHaveLength(1);
      expect(result[0].duration_minutes).toBe(30);
      expect(result[0].steps).toBe(3200);
      expect(result[0].total_calories_burned).toBe(300);
    });

    it('retourne un tableau vide en cas d\'erreur', async () => {
      mock.onGet(/\/activities\/log\//).reply(401);
      const result = await activityService.getUserActivities();
      expect(result).toEqual([]);
    });
  });

  describe('logActivity', () => {
    it('crée et retourne une activité utilisateur', async () => {
      mock.onPost(/\/activities\/log\//).reply(201, userActivity);
      const payload = {
        activity: 1,
        start: '2026-05-22T08:00:00Z',
        duration_minutes: 30,
        intensity: 'Modérée',
        steps: 3200,
      };
      const result = await activityService.logActivity(payload);
      expect(result.id).toBe(1);
      expect(result.steps).toBe(3200);
      expect(result.total_calories_burned).toBe(300);
    });

    it('lève une erreur en cas de réponse 400', async () => {
      mock.onPost(/\/activities\/log\//).reply(400, { detail: 'Invalid data' });
      await expect(
        activityService.logActivity({ activity: 0, start: '', duration_minutes: 0 })
      ).rejects.toBeDefined();
    });
  });

  describe('deleteActivity', () => {
    it('envoie une requête DELETE et résout sans erreur', async () => {
      mock.onDelete(/\/activities\/log\/1\//).reply(204);
      await expect(activityService.deleteActivity(1)).resolves.toBeUndefined();
    });

    it('lève une erreur si l\'activité n\'existe pas', async () => {
      mock.onDelete(/\/activities\/log\/99\//).reply(404);
      await expect(activityService.deleteActivity(99)).rejects.toBeDefined();
    });
  });
});
