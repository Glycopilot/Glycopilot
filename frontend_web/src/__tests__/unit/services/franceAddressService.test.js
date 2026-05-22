import {
  fetchCommunesByPostalCode,
  normalizeCityName,
  validateAddressInBan,
  validatePostalCityMatch,
} from '../../../services/franceAddressService';

function mockJsonFetch(body, ok = true) {
  return {
    ok,
    headers: { get: (name) => (name === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  };
}

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
    global.fetch.mockResolvedValueOnce(mockJsonFetch([{ nom: 'Paris', code: '75056' }]));
    const communes = await fetchCommunesByPostalCode('75001');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/france/communes/?postal_code=75001'),
    );
    expect(communes[0].name).toBe('Paris');
  });

  it('fetchCommunesByPostalCode retourne Thiais pour 94320', async () => {
    global.fetch.mockResolvedValueOnce(mockJsonFetch([{ nom: 'Thiais', code: '94073' }]));
    const communes = await fetchCommunesByPostalCode('94320');
    expect(communes[0].name).toBe('Thiais');
  });

  it('validatePostalCityMatch accepte ville correcte', async () => {
    global.fetch.mockResolvedValueOnce(mockJsonFetch([{ nom: 'Lyon', code: '69123' }]));
    const result = await validatePostalCityMatch('69001', 'Lyon');
    expect(result.valid).toBe(true);
  });

  it('validatePostalCityMatch refuse ville incorrecte', async () => {
    global.fetch.mockResolvedValueOnce(mockJsonFetch([{ nom: 'Paris', code: '75056' }]));
    const result = await validatePostalCityMatch('75001', 'Lyon');
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/ne correspond pas/);
  });

  it('validateAddressInBan accepte une adresse trouvée', async () => {
    global.fetch.mockResolvedValueOnce(mockJsonFetch({
      features: [{
        properties: {
          label: '15 Rue Saint-Denis 75001 Paris',
          name: '15 Rue Saint-Denis',
          postcode: '75001',
          city: 'Paris',
        },
      }],
    }));
    const result = await validateAddressInBan({
      postalCode: '75001',
      city: 'Paris',
      address: '15 rue saint-denis',
    });
    expect(result.valid).toBe(true);
  });

  it('validateAddressInBan refuse une adresse inventée', async () => {
    global.fetch.mockResolvedValueOnce(mockJsonFetch({ features: [] }));
    const result = await validateAddressInBan({
      postalCode: '75001',
      city: 'Paris',
      address: '999 rue inexistante xyz',
    });
    expect(result.valid).toBe(false);
  });
});
