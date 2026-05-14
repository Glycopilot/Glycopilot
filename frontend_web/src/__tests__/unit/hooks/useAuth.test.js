import { renderHook, act } from '@testing-library/react';

jest.mock('../../../services/authService', () => ({
  __esModule: true,
  default: {
    login:    jest.fn(),
    register: jest.fn(),
    logout:   jest.fn(),
  },
}));

import authService from '../../../services/authService';
import { useAuth } from '../../../hooks/useAuth';

beforeEach(() => jest.clearAllMocks());

describe('useAuth', () => {
  describe('login', () => {
    it('renvoie le résultat de authService.login en cas de succès', async () => {
      authService.login.mockResolvedValueOnce({ access: 'a' });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const res = await result.current.login('a@b.c', 'pw');
        expect(res.access).toBe('a');
      });

      expect(authService.login).toHaveBeenCalledWith('a@b.c', 'pw');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('');
    });

    it('passe loading=true pendant l\'appel', async () => {
      let resolve;
      authService.login.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
      const { result } = renderHook(() => useAuth());

      act(() => { result.current.login('a@b.c', 'pw'); });
      // L'état React a été mis à jour de manière synchrone après setLoading(true).
      expect(result.current.loading).toBe(true);

      await act(async () => { resolve({}); });
      expect(result.current.loading).toBe(false);
    });

    it('stocke le message d\'erreur et relance', async () => {
      authService.login.mockRejectedValueOnce(new Error('Bad creds'));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.login('a@b.c', 'pw')).rejects.toThrow('Bad creds');
      });

      expect(result.current.error).toBe('Bad creds');
      expect(result.current.loading).toBe(false);
    });
  });

  describe('register', () => {
    it('renvoie le résultat de authService.register en cas de succès', async () => {
      authService.register.mockResolvedValueOnce({ user: { email: 'a@b.c' } });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const res = await result.current.register({ email: 'a@b.c' });
        expect(res.user.email).toBe('a@b.c');
      });
      expect(result.current.error).toBe('');
    });

    it('propage l\'erreur', async () => {
      authService.register.mockRejectedValueOnce(new Error('Email existant'));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.register({})).rejects.toThrow('Email existant');
      });
      expect(result.current.error).toBe('Email existant');
    });
  });

  describe('logout', () => {
    it('appelle authService.logout sans throw', async () => {
      authService.logout.mockResolvedValueOnce({});
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(authService.logout).toHaveBeenCalled();
      expect(result.current.error).toBe('');
    });

    it('stocke l\'erreur et la propage si logout échoue', async () => {
      authService.logout.mockRejectedValueOnce(new Error('Réseau'));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.logout()).rejects.toThrow('Réseau');
      });
      expect(result.current.error).toBe('Réseau');
    });
  });

  it('expose login, register, logout, loading, error', () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });
});
