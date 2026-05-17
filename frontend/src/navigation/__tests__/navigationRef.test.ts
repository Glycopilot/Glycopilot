import { navigate, setNavigate } from '../navigationRef';

describe('navigationRef', () => {
  it('ignores navigation before a navigate function is registered', () => {
    expect(() => navigate('Home')).not.toThrow();
  });

  it('delegates navigation to the registered function', () => {
    const navigateMock = jest.fn();

    setNavigate(navigateMock);
    navigate('Profile');

    expect(navigateMock).toHaveBeenCalledWith('Profile');
  });

  it('replaces the registered navigate function', () => {
    const previous = jest.fn();
    const next = jest.fn();

    setNavigate(previous);
    setNavigate(next);
    navigate('Glycemia');

    expect(previous).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith('Glycemia');
  });
});
