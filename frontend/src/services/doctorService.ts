import apiClient from './apiClient';

export interface DoctorMemberDetails {
  id_user: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  specialty?: string | null;
  medical_center_name?: string | null;
  medical_center_address?: string | null;
}

export interface DoctorMember {
  id_team_member: string;
  member_details: DoctorMemberDetails;
  role: string;
  role_label: string;
  status: string;
}

export interface FamilyMember {
  id_team_member: string;
  member_details: {
    first_name: string;
    last_name: string;
    phone_number: string | null;
  };
  relation_type: string;
  role: string;
  status: string;
}

export interface MyTeamResponse {
  doctors: DoctorMember[];
  pending_doctor_invites: DoctorMember[];
  family: FamilyMember[];
}

const doctorService = {
  async getMyTeam(): Promise<MyTeamResponse> {
    const response = await apiClient.get<MyTeamResponse>(
      '/doctors/care-team/my-team/'
    );
    return response.data;
  },

  async inviteDoctor(
    email: string,
    role: string = 'REFERENT_DOCTOR'
  ): Promise<void> {
    await apiClient.post('/doctors/care-team/invite-doctor/', { email, role });
  },

  async acceptInvitation(id_team_member: string): Promise<void> {
    await apiClient.post('/doctors/care-team/accept-invitation/', { id_team_member });
  },

  async addFamilyMember(data: {
    first_name: string;
    last_name: string;
    phone_number?: string;
    relation_type: string;
  }): Promise<{ id: string }> {
    const response = await apiClient.post<{ id: string }>(
      '/doctors/care-team/add-family/',
      { ...data, role: 'FAMILY' }
    );
    return response.data;
  },
};

export default doctorService;
