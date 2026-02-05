import { useState, useEffect } from 'react';
import authService from '../services/authService';
import type { User } from '../types/auth.types';

interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook pour récupérer les informations de l'utilisateur connecté
 */
export default function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setError((apiError as Error).message);
        }
      }
    } catch (err) {
      setError((err as Error).message);
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
