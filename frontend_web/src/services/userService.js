import authService from './authService';

const apiClient = authService.getApiClient();

/**
 * Service pour gérer les utilisateurs/patients
 */
const userService = {
  /**
   * Récupérer tous les utilisateurs
   * @returns {Promise} Liste des utilisateurs
   */
  async getAllUsers() {
    try {
      const response = await apiClient.get('/users/');
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Erreur lors de la récupération des utilisateurs';
      throw new Error(message);
    }
  },

  /**
   * Récupérer un utilisateur par ID
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise} Données de l'utilisateur
   */
  async getUserById(userId) {
    try {
      const response = await apiClient.get(`/users/${userId}/`);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Erreur lors de la récupération de l'utilisateur";
      throw new Error(message);
    }
  },

  /**
   * Créer un nouveau patient
   * @param {object} patientData - Données du patient
   * @returns {Promise} Données du patient créé
   */
  async createPatient(patientData) {
    try {
      const response = await apiClient.post('/users/', {
        email: patientData.email,
        username: patientData.username,
        first_name: patientData.firstName,
        last_name: patientData.lastName,
        password: patientData.password,
        role: 'patient', // Définir le rôle comme patient
        phone: patientData.phone || '',
        date_of_birth: patientData.dateOfBirth || null,
      });
      return response.data;
    } catch (error) {
      console.error('userService.createPatient error:', error.response?.data);
      
      let message = 'Erreur lors de la création du patient';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          message = error.response.data;
        } else if (error.response.data.error) {
          message = error.response.data.error;
        } else if (error.response.data.detail) {
          message = error.response.data.detail;
        } else {
          // Formatter les erreurs de validation
          const errors = [];
          Object.keys(error.response.data).forEach(key => {
            const fieldErrors = error.response.data[key];
            if (Array.isArray(fieldErrors)) {
              errors.push(`${key}: ${fieldErrors.join(', ')}`);
            } else {
              errors.push(`${key}: ${fieldErrors}`);
            }
          });
          if (errors.length > 0) {
            message = errors.join(' | ');
          }
        }
      }
      
      throw new Error(message);
    }
  },

  /**
   * Mettre à jour un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {object} userData - Données à mettre à jour
   * @returns {Promise} Données de l'utilisateur mis à jour
   */
  async updateUser(userId, userData) {
    try {
      const response = await apiClient.patch(`/users/${userId}/`, userData);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Erreur lors de la mise à jour de l'utilisateur";
      throw new Error(message);
    }
  },

  /**
   * Supprimer un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise} Confirmation de suppression
   */
  async deleteUser(userId) {
    try {
      await apiClient.delete(`/users/${userId}/`);
      return { message: 'Utilisateur supprimé avec succès' };
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Erreur lors de la suppression de l'utilisateur";
      throw new Error(message);
    }
  },

  /**
   * Récupérer tous les patients (utilisateurs avec role='patient')
   * @returns {Promise} Liste des patients
   */
  async getAllPatients() {
    try {
      const response = await apiClient.get('/users/?role=patient');
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Erreur lors de la récupération des patients';
      throw new Error(message);
    }
  },

  /**
   * Rechercher des utilisateurs
   * @param {string} query - Terme de recherche
   * @returns {Promise} Liste des utilisateurs correspondants
   */
  async searchUsers(query) {
    try {
      const response = await apiClient.get(`/users/?search=${query}`);
      return response.data;
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Erreur lors de la recherche des utilisateurs';
      throw new Error(message);
    }
  },
};

export default userService;