import { useState, useEffect } from 'react';
import authService from '../services/authService';

/**
 * Hook pour récupérer les informations de l'utilisateur connecté
 * @returns {Object} { user, loading, error, refetch }
 */
export default function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      // D'abord, essayer de récupérer l'utilisateur stocké localement
      const storedUser = await authService.getStoredUser();

      if (storedUser) {
        setUser(storedUser);
      }

      // Ensuite, récupérer les infos à jour du backend
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (apiError) {
        // Si la requête API échoue, garder l'utilisateur stocké
        if (!storedUser) {
          setError(apiError.message);
        }
      }
    } catch (err) {
      setError(err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return {
    user,
    loading,
    error,
    refetch: fetchUser,
  };
}
