/**
 * @file useAuth.test.js
 * Tests du hook useAuth
 */
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

// Mock authService
jest.mock('../services/authService', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
  },
}));

import authService from '../services/authService';

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── login ─────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('returns result and resets loading on success', async () => {
      authService.login.mockResolvedValueOnce({ access: 'tok' });
      const { result } = renderHook(() => useAuth());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.login('a@b.com', 'pass');
      });

      expect(authService.login).toHaveBeenCalledWith('a@b.com', 'pass');
      expect(returnValue).toEqual({ access: 'tok' });
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('');
    });

    it('sets error state and rethrows on failure', async () => {
      authService.login.mockRejectedValueOnce(new Error('Identifiants invalides'));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.login('a@b.com', 'wrong')).rejects.toThrow('Identifiants invalides');
      });

      expect(result.current.error).toBe('Identifiants invalides');
      expect(result.current.loading).toBe(false);
    });

    it('sets loading to true during request', async () => {
      let resolve;
      authService.login.mockReturnValueOnce(new Promise(r => { resolve = r; }));
      const { result } = renderHook(() => useAuth());

      act(() => { result.current.login('a@b.com', 'pass'); });
      expect(result.current.loading).toBe(true);
      
      await act(async () => { resolve({ access: 'tok' }); });
      expect(result.current.loading).toBe(false);
    });
  });

  // ── register ──────────────────────────────────────────────────────────────
  describe('register', () => {
    const userData = { email: 'new@doc.com', firstName: 'Doc', lastName: 'Test', password: 'pw' };

    it('returns result on success', async () => {
      authService.register.mockResolvedValueOnce({ access: 'tok', user: {} });
      const { result } = renderHook(() => useAuth());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.register(userData);
      });

      expect(authService.register).toHaveBeenCalledWith(userData);
      expect(returnValue.access).toBe('tok');
      expect(result.current.loading).toBe(false);
    });

    it('sets error and rethrows on failure', async () => {
      authService.register.mockRejectedValueOnce(new Error('Email déjà utilisé'));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.register(userData)).rejects.toThrow('Email déjà utilisé');
      });

      expect(result.current.error).toBe('Email déjà utilisé');
      expect(result.current.loading).toBe(false);
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('calls authService.logout and resets loading', async () => {
      authService.logout.mockResolvedValueOnce({ message: 'ok' });
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(authService.logout).toHaveBeenCalled();
      expect(result.current.loading).toBe(false);
    });

    it('sets error and rethrows on failure', async () => {
      authService.logout.mockRejectedValueOnce(new Error('Erreur réseau'));
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await expect(result.current.logout()).rejects.toThrow('Erreur réseau');
      });

      expect(result.current.error).toBe('Erreur réseau');
    });
  });

  // ── initial state ─────────────────────────────────────────────────────────
  it('initializes with loading=false and empty error', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.register).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });
});
