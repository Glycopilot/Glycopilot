/**
 * Extrait un message utilisateur depuis une réponse API (axios).
 * Masque les formulations techniques Django / ORM.
 */

const EMAIL_ALREADY_USED =
  'Cette adresse email est déjà associée à un compte. Connectez-vous ou utilisez une autre adresse.';

const PATTERNS = [
  {
    test: /auth\s*account|authaccount|objet\s+auth|ce\s+champ\s+email|unique constraint|already exists/i,
    message: EMAIL_ALREADY_USED,
  },
  {
    test: /invalid credentials|identifiants|authentication failed/i,
    message: 'Email ou mot de passe incorrect.',
  },
  {
    test: /not found|introuvable/i,
    message: 'Aucun compte trouvé avec ces informations.',
  },
];

function humanize(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) return null;
  for (const { test, message } of PATTERNS) {
    if (test.test(trimmed)) return message;
  }
  return trimmed;
}

function firstString(value) {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] != null ? String(value[0]) : null;
  if (typeof value === 'object') {
    const nested = Object.values(value)[0];
    return firstString(nested);
  }
  return String(value);
}

/**
 * @param {import('axios').AxiosError|Error} error
 * @param {string} fallback
 * @returns {string}
 */
export function parseApiError(error, fallback = 'Une erreur est survenue. Veuillez réessayer.') {
  const data = error?.response?.data;

  if (!data) {
    return humanize(error?.message) || fallback;
  }

  if (typeof data === 'string') {
    return humanize(data) || fallback;
  }

  const candidates = [
    data.error,
    data.detail,
    data.email,
    data.non_field_errors,
    data.password,
    data.password_confirm,
    data.errors?.email,
    data.errors?.non_field_errors,
  ];

  for (const c of candidates) {
    const msg = humanize(firstString(c));
    if (msg) return msg;
  }

  if (data.errors && typeof data.errors === 'object') {
    for (const val of Object.values(data.errors)) {
      const msg = humanize(firstString(val));
      if (msg) return msg;
    }
  }

  return fallback;
}
