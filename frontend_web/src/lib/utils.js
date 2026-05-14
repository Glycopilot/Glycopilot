export function toArr(data, keys = ['results', 'data']) {
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
  return [];
}

export function extractValue(field) {
  if (field == null) return null;
  if (typeof field === 'object') return field.value ?? null;
  return field;
}

export function getInitials(firstName, lastName) {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

export function hba1cBand(value) {
  if (value == null) return null;
  if (value < 7) return { color: '#16A34A', bg: '#F0FDF4', label: 'Objectif atteint' };
  if (value < 8) return { color: '#F97316', bg: '#FFF7ED', label: 'Légèrement élevée' };
  return { color: '#DC2626', bg: '#FEF2F2', label: 'Élevée' };
}

const EMAIL_RE = /\S+@\S+\.\S+/;

export function validateEmail(email) {
  if (!email) return 'Email manquant';
  if (!EMAIL_RE.test(email)) return "L'adresse email n'est pas valide";
  return null;
}

export function validatePassword(pw) {
  if (!pw) return 'Le mot de passe est requis';
  if (pw.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
  if (!/\d/.test(pw)) return 'Le mot de passe doit contenir au moins un chiffre';
  if (!/[A-Z]/.test(pw)) return 'Le mot de passe doit contenir au moins une lettre majuscule';
  return null;
}

export function flattenAuthMe(data) {
  const identity = data?.identity ?? {};
  const profile = identity?.profiles?.[0] ?? {};
  const doctor = profile?.doctor_details ?? {};
  const user = doctor?.user_details ?? {};

  return {
    id_auth: data?.id_auth,
    id_user: identity?.id_user,
    email: data?.email ?? user?.email,
    first_name: identity?.first_name ?? user?.first_name,
    last_name: identity?.last_name ?? user?.last_name,
    phone_number: user?.phone_number,
    doctor_id: doctor?.doctor_id,
    license_number: doctor?.license_number,
    verification_status: doctor?.verification_status,
    specialty: doctor?.specialty,
    medical_center_name: doctor?.medical_center_name,
    medical_center_address: doctor?.medical_center_address,
  };
}
