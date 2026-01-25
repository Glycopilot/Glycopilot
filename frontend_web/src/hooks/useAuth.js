import { useState } from 'react';
import authService from '../services/authService';

/**
 * Hook personnalisé pour gérer l'authentification
 * 
 * À quoi il sert :
 * - Centralise la logique d'authentification (login, register, logout)
 * - Gère automatiquement les états de chargement (loading)
 * - Gère automatiquement les erreurs (error)
 * - Évite de répéter le code try/catch dans chaque composant
 * - Facilite la réutilisation de la logique d'auth dans plusieurs composants
 * 
 * Exemple d'utilisation :
 * ```javascript
 * const { login, loading, error } = useAuth();
 * 
 * const handleSubmit = async () => {
 *   try {
 *     await login(email, password);
 *     // Succès - rediriger l'utilisateur
 *   } catch (err) {
 *     // Erreur - afficher un toast
 *   }
 * };
 * ```
 */
export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Connecter un utilisateur
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe
   * @returns {Promise} Résultat de la connexion
   */
  const login = async (email, password) => {
    setLoading(true);
    setError('');
    try {
      const result = await authService.login(email, password);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Inscrire un nouvel utilisateur
   * @param {object} userData - Données d'inscription (email, firstName, lastName, password, passwordConfirm)
   * @returns {Promise} Résultat de l'inscription
   */
  const register = async (userData) => {
    setLoading(true);
    setError('');
    try {
      const result = await authService.register(userData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Déconnecter l'utilisateur
   * @returns {Promise} Confirmation de déconnexion
   */
  const logout = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.logout();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    register,
    logout,
    loading,
    error,
  };
};