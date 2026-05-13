import { colors } from '../colors';

describe('colors theme', () => {
  it('exposes primary color', () => {
    expect(colors.primary).toBeDefined();
    expect(typeof colors.primary).toBe('string');
  });

  it('exposes text colors', () => {
    expect(colors.textPrimary).toBeDefined();
    expect(colors.textSecondary).toBeDefined();
  });

  it('exposes background colors', () => {
    expect(colors.backgroundColor).toBeDefined();
    expect(colors.lightBg).toBeDefined();
  });

  it('all color values are strings', () => {
    Object.values(colors).forEach(value => {
      expect(typeof value).toBe('string');
    });
  });
});
