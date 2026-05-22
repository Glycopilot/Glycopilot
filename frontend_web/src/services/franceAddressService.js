/**
 * Adresses France via l'API Django (/api/france/…) — fiable en Docker et en prod.
 * (Le proxy CRA /geo-api renvoie souvent du HTML hors dev local.)
 */
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8006/api').replace(/\/$/, '');

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

async function parseJsonResponse(res, fallbackError) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(fallbackError);
  }
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.detail || fallbackError;
    throw new Error(typeof msg === 'string' ? msg : fallbackError);
  }
  return data;
}

export async function fetchCommunesByPostalCode(postalCode) {
  const postal = (postalCode || '').trim();
  if (!isValidPostalCodeFormat(postal)) return [];

  const url = `${API_BASE}/france/communes/?postal_code=${encodeURIComponent(postal)}`;
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Service adresse temporairement indisponible. Vérifiez votre connexion.');
  }
  const data = await parseJsonResponse(
    res,
    'Impossible de charger les villes pour ce code postal.',
  );

  if (!Array.isArray(data)) return [];

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

export async function searchStreetAddresses({ query, postalCode, city, limit = 8 }) {
  const q = (query || '').trim();
  if (q.length < 3) return [];
  if (!isValidPostalCodeFormat(postalCode)) return [];

  const params = new URLSearchParams({
    q,
    postcode: postalCode.trim(),
    limit: String(limit),
  });
  if (city?.trim()) params.set('city', city.trim());

  const res = await fetch(`${API_BASE}/france/addresses/search/?${params}`);
  const data = await parseJsonResponse(res, 'Service adresse indisponible.');
  const postal = postalCode.trim();

  return (data.features || [])
    .map((f) => ({
      label: f.properties.label,
      street: f.properties.name,
      postcode: f.properties.postcode,
      city: f.properties.city,
    }))
    .filter((item) => !item.postcode || item.postcode === postal);
}

function normalizeAddressToken(value) {
  return normalizeCityName(value).replace(/[^a-z0-9]/g, '');
}

function addressMatchesBanResult(input, result) {
  const normInput = normalizeAddressToken(input);
  if (!normInput) return false;
  const normLabel = normalizeAddressToken(result.label);
  const normStreet = normalizeAddressToken(result.street || '');
  return (
    normLabel.includes(normInput)
    || normInput.includes(normStreet)
    || normStreet.includes(normInput)
    || normInput === normLabel
  );
}

/** Vérifie que l'adresse existe dans la Base Adresse Nationale. */
export async function validateAddressInBan({ postalCode, city, address }) {
  const addr = (address || '').trim();
  if (addr.length < 3) {
    return { valid: false, error: 'Adresse trop courte (min. 3 caractères).' };
  }

  try {
    const results = await searchStreetAddresses({
      query: addr,
      postalCode,
      city,
      limit: 8,
    });
    if (results.length === 0) {
      return {
        valid: false,
        error: 'Adresse introuvable. Choisissez une adresse proposée sous le champ.',
      };
    }
    const ok = results.some((r) => addressMatchesBanResult(addr, r));
    if (!ok) {
      return {
        valid: false,
        error: 'Adresse non reconnue. Cliquez sur une adresse dans la liste déroulante.',
      };
    }
    return { valid: true, error: null, suggestions: results };
  } catch {
    return { valid: false, error: 'Service adresse indisponible, réessayez.' };
  }
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

  const ban = await validateAddressInBan({ postalCode, city, address });
  if (!ban.valid) {
    return { valid: false, error: ban.error, communes: match.communes };
  }

  return { valid: true, error: null, communes: match.communes };
}
