import { useState } from 'react';
import authService from '../services/authService';
import type { LoginResponse, RegisterData } from '../types/auth.types';

interface UseAuthReturn {
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (
    userData: RegisterData & { passwordConfirm: string }
  ) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string;
}

export const useAuth = (): UseAuthReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const login = async (
    email: string,
    password: string
  ): Promise<LoginResponse> => {
    setLoading(true);
    setError('');
    try {
      const result = await authService.login(email, password);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    userData: RegisterData & { passwordConfirm: string }
  ): Promise<LoginResponse> => {
    setLoading(true);
    setError('');
    try {
      const result = await authService.register(userData);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
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
