const GEO_API = 'https://geo.api.gouv.fr';
const ADRESSE_API = 'https://api-adresse.data.gouv.fr';

export function normalizeCityName(name) {
  return (name || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isValidPostalCodeFormat(postalCode) {
  return /^\d{5}$/.test((postalCode || '').trim());
}

export async function fetchCommunesByPostalCode(postalCode) {
  const postal = (postalCode || '').trim();
  if (!isValidPostalCodeFormat(postal)) return [];

  const url = `${GEO_API}/communes?codePostal=${encodeURIComponent(postal)}&fields=nom,code`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Impossible de récupérer les villes pour ce code postal.');
  }

  const data = await res.json();
  return data
    .map((c) => ({ name: c.nom, code: c.code }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function validatePostalCityMatch(postalCode, cityName) {
  const postal = (postalCode || '').trim();
  const city = (cityName || '').trim();

  if (!isValidPostalCodeFormat(postal)) {
    return { valid: false, error: 'Le code postal doit contenir 5 chiffres.', communes: [] };
  }
  if (!city) {
    return { valid: false, error: 'Veuillez sélectionner une ville.', communes: [] };
  }

  const communes = await fetchCommunesByPostalCode(postal);
  if (communes.length === 0) {
    return { valid: false, error: 'Code postal inconnu en France.', communes: [] };
  }

  const normCity = normalizeCityName(city);
  const match = communes.some((c) => normalizeCityName(c.name) === normCity);
  return {
    valid: match,
    communes,
    error: match ? null : 'La ville ne correspond pas à ce code postal.',
  };
}

export async function searchStreetAddresses({ query, postalCode, city, limit = 6 }) {
  const q = (query || '').trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({ q, limit: String(limit) });
  if (postalCode && isValidPostalCodeFormat(postalCode)) {
    params.set('postcode', postalCode.trim());
  }
  if (city) params.set('city', city.trim());

  const res = await fetch(`${ADRESSE_API}/search/?${params}`);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.features || []).map((f) => ({
    label: f.properties.label,
    street: f.properties.name,
    postcode: f.properties.postcode,
    city: f.properties.city,
  }));
}

export async function validateFrenchAddress({ postalCode, city, address }) {
  const postalErr = !isValidPostalCodeFormat(postalCode)
    ? 'Le code postal doit contenir 5 chiffres.'
    : null;
  if (postalErr) return { valid: false, error: postalErr };

  const match = await validatePostalCityMatch(postalCode, city);
  if (!match.valid) return match;

  if (!(address || '').trim()) {
    return { valid: false, error: 'Veuillez saisir une adresse.' };
  }

  return { valid: true, error: null, communes: match.communes };
}
