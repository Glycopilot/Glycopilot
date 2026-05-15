import authService from './authService';

function client() {
  return authService.getApiClient();
}

const userService = {
  async getAllUsers() {
    const { data } = await client().get('/users/');
    return data;
  },

  async getUserById(id) {
    const { data } = await client().get(`/users/${id}/`);
    return data;
  },

  async createPatient(payload) {
    const { data } = await client().post('/users/', { ...payload, role: 'patient' });
    return data;
  },

  async updateUser(id, body) {
    const { data } = await client().patch(`/users/${id}/`, body);
    return data;
  },

  async deleteUser(id) {
    await client().delete(`/users/${id}/`);
    return { message: 'Utilisateur supprimé avec succès' };
  },

  async getAllPatients() {
    const { data } = await client().get('/users/?role=patient');
    return data;
  },

  async searchUsers(query) {
    const { data } = await client().get(`/users/?search=${query}`);
    return data;
  },
};

export default userService;
