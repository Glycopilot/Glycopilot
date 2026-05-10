import { useState, useEffect } from 'react';
import authService from '../services/authService';
import type { User } from '../types/auth.types';

interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Cache module-level : évite les appels redondants depuis Header + Banner + Screen montés ensemble
let cachedUser: User | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

export const clearUserCache = (): void => {
  cachedUser = null;
  cacheExpiresAt = 0;
};

/**
 * Hook pour récupérer les informations de l'utilisateur connecté
 */
export default function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [loading, setLoading] = useState(cachedUser === null);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async (force = false) => {
    // Retourner le cache si encore valide et pas de force refresh
    if (!force && cachedUser && Date.now() < cacheExpiresAt) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const storedUser = await authService.getStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }

      try {
        const currentUser = await authService.getCurrentUser();
        cachedUser = currentUser;
        cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        setUser(currentUser);
      } catch (apiError) {
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
    refetch: () => fetchUser(true),
  };
}
