import { navigate, setNavigate } from '../navigationRef';

describe('navigationRef', () => {
  afterEach(() => {
    // Reset the navigate function after each test
    setNavigate(() => {});
  });

  it('navigate does nothing when no fn is set', () => {
    // Reset to null-like state by providing no-op then re-clearing
    setNavigate(() => {});
    setNavigate(undefined as any);
    expect(() => navigate('Home')).not.toThrow();
  });

  it('setNavigate stores the function and navigate calls it', () => {
    const mockFn = jest.fn();
    setNavigate(mockFn);

    navigate('Home');

    expect(mockFn).toHaveBeenCalledWith('Home');
  });

  it('navigate calls the most recently set function', () => {
    const first = jest.fn();
    const second = jest.fn();

    setNavigate(first);
    setNavigate(second);

    navigate('Profile');

    expect(second).toHaveBeenCalledWith('Profile');
    expect(first).not.toHaveBeenCalled();
  });
});
