import MockAdapter from 'axios-mock-adapter';
import apiClient from '../apiClient';
import doctorService from '../doctorService';
import type { MyTeamResponse } from '../doctorService';

describe('doctorService', () => {
  let mock: MockAdapter;

  const mockTeam: MyTeamResponse = {
    doctors: [
      {
        id_team_member: 'tm-1',
        member_details: {
          id_user: 'u-1',
          first_name: 'Jean',
          last_name: 'Dupont',
          email: 'jean@hopital.fr',
          phone_number: '+33612345678',
          specialty: 'Endocrinologie',
          medical_center_name: 'CHU Lyon',
        },
        role: 'REFERENT_DOCTOR',
        role_label: 'Médecin référent',
        status: 'ACTIVE',
        approved_by: null,
      },
    ],
    pending_doctor_invites: [],
    family: [
      {
        id_team_member: 'tm-2',
        member_details: {
          first_name: 'Marie',
          last_name: 'Dupont',
          phone_number: '+33698765432',
        },
        relation_type: 'sister',
        role: 'FAMILY',
        status: 'ACTIVE',
      },
    ],
  };

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('getMyTeam', () => {
    it('should return team data on success', async () => {
      mock.onGet('/doctors/care-team/my-team/').reply(200, mockTeam);

      const result = await doctorService.getMyTeam();

      expect(result).toEqual(mockTeam);
      expect(result.doctors).toHaveLength(1);
      expect(result.family).toHaveLength(1);
    });

    it('should throw on server error', async () => {
      mock.onGet('/doctors/care-team/my-team/').reply(500);

      await expect(doctorService.getMyTeam()).rejects.toThrow();
    });

    it('should throw on network error', async () => {
      mock.onGet('/doctors/care-team/my-team/').networkError();

      await expect(doctorService.getMyTeam()).rejects.toThrow();
    });

    it('should throw on 403 unauthorized', async () => {
      mock.onGet('/doctors/care-team/my-team/').reply(403);

      await expect(doctorService.getMyTeam()).rejects.toThrow();
    });
  });

  describe('inviteDoctor', () => {
    it('should post invite with default REFERENT_DOCTOR role', async () => {
      mock.onPost('/doctors/care-team/invite-doctor/').reply(200);

      await doctorService.inviteDoctor('doc@example.com');

      const sentData = JSON.parse(mock.history.post[0].data);
      expect(sentData).toEqual({ email: 'doc@example.com', role: 'REFERENT_DOCTOR' });
    });

    it('should post invite with custom role', async () => {
      mock.onPost('/doctors/care-team/invite-doctor/').reply(200);

      await doctorService.inviteDoctor('doc@example.com', 'CONSULTING_DOCTOR');

      const sentData = JSON.parse(mock.history.post[0].data);
      expect(sentData.role).toBe('CONSULTING_DOCTOR');
    });

    it('should throw on error', async () => {
      mock.onPost('/doctors/care-team/invite-doctor/').reply(400, { detail: 'Email already invited' });

      await expect(doctorService.inviteDoctor('doc@example.com')).rejects.toThrow();
    });
  });

  describe('acceptInvitation', () => {
    it('should post correct payload', async () => {
      mock.onPost('/doctors/care-team/accept-invitation/').reply(200);

      await doctorService.acceptInvitation('tm-abc');

      const sentData = JSON.parse(mock.history.post[0].data);
      expect(sentData).toEqual({ id_team_member: 'tm-abc' });
    });

    it('should throw on 404', async () => {
      mock.onPost('/doctors/care-team/accept-invitation/').reply(404);

      await expect(doctorService.acceptInvitation('tm-not-found')).rejects.toThrow();
    });
  });

  describe('removeTeamMember', () => {
    it('should post correct payload', async () => {
      mock.onPost('/doctors/care-team/remove-member/').reply(200);

      await doctorService.removeTeamMember('tm-xyz');

      const sentData = JSON.parse(mock.history.post[0].data);
      expect(sentData).toEqual({ id_team_member: 'tm-xyz' });
    });

    it('should throw on error', async () => {
      mock.onPost('/doctors/care-team/remove-member/').reply(403);

      await expect(doctorService.removeTeamMember('tm-xyz')).rejects.toThrow();
    });
  });

  describe('addFamilyMember', () => {
    it('should add family member with required fields', async () => {
      mock.onPost('/doctors/care-team/add-family/').reply(201, { id: 'fm-1' });

      const result = await doctorService.addFamilyMember({
        first_name: 'Pierre',
        last_name: 'Martin',
        relation_type: 'brother',
      });

      expect(result).toEqual({ id: 'fm-1' });
      const sentData = JSON.parse(mock.history.post[0].data);
      expect(sentData).toEqual({
        first_name: 'Pierre',
        last_name: 'Martin',
        relation_type: 'brother',
        role: 'FAMILY',
      });
    });

    it('should include phone_number when provided', async () => {
      mock.onPost('/doctors/care-team/add-family/').reply(201, { id: 'fm-2' });

      await doctorService.addFamilyMember({
        first_name: 'Sophie',
        last_name: 'Blanc',
        phone_number: '+33611223344',
        relation_type: 'mother',
      });

      const sentData = JSON.parse(mock.history.post[0].data);
      expect(sentData.phone_number).toBe('+33611223344');
      expect(sentData.role).toBe('FAMILY');
    });

    it('should throw on validation error', async () => {
      mock.onPost('/doctors/care-team/add-family/').reply(400);

      await expect(
        doctorService.addFamilyMember({ first_name: '', last_name: '', relation_type: '' })
      ).rejects.toThrow();
    });
  });
});
