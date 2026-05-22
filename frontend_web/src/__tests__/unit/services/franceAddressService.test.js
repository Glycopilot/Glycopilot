import {
  fetchCommunesByPostalCode,
  normalizeCityName,
  validatePostalCityMatch,
} from '../../../services/franceAddressService';

describe('franceAddressService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizeCityName ignore les accents', () => {
    expect(normalizeCityName('Saint-Étienne')).toBe('saint-etienne');
  });

  it('fetchCommunesByPostalCode retourne Paris pour 75001', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ nom: 'Paris', code: '75056' }],
    });
    const communes = await fetchCommunesByPostalCode('75001');
    expect(communes[0].name).toBe('Paris');
  });

  it('validatePostalCityMatch accepte ville correcte', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ nom: 'Lyon', code: '69123' }],
    });
    const result = await validatePostalCityMatch('69001', 'Lyon');
    expect(result.valid).toBe(true);
  });

  it('validatePostalCityMatch refuse ville incorrecte', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ nom: 'Paris', code: '75056' }],
    });
    const result = await validatePostalCityMatch('75001', 'Lyon');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/ne correspond pas/);
  });
});
