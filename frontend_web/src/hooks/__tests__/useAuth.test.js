import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import authService from '../services/authService';

jest.mock('../services/authService', () => ({
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
}));

describe('useAuth hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initial with default values', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('login should set loading and call authService.login', async () => {
    authService.login.mockResolvedValueOnce({ user: 'test' });
    const { result } = renderHook(() => useAuth());

    let promise;
    await act(async () => {
      promise = result.current.login('email', 'pass');
    });

    const loginResult = await promise;
    expect(loginResult).toEqual({ user: 'test' });
    expect(authService.login).toHaveBeenCalledWith('email', 'pass');
    expect(result.current.loading).toBe(false);
  });

  it('login should set error on failure', async () => {
    authService.login.mockRejectedValueOnce(new Error('Invalid'));
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login('email', 'pass');
      } catch (e) {
        // expected
      }
    });

    expect(result.current.error).toBe('Invalid');
    expect(result.current.loading).toBe(false);
  });

  it('register should call authService.register', async () => {
    authService.register.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register({ email: 'test' });
    });

    expect(authService.register).toHaveBeenCalledWith({ email: 'test' });
    expect(result.current.loading).toBe(false);
  });

  it('logout should call authService.logout', async () => {
    authService.logout.mockResolvedValueOnce();
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.logout).toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });
});
