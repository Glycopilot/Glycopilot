import { validateFrenchAddress } from './franceAddressService';

export function buildDoctorProfilePayload(form) {
  return {
    first_name: form.first_name,
    last_name: form.last_name,
    phone_number: form.phone_number || '',
    specialty: form.specialty,
    medical_center_name: form.medical_center_name,
    medical_center_address: form.medical_center_address || '',
    medical_center_postal_code: (form.medical_center_postal_code || '').trim(),
    medical_center_city: (form.medical_center_city || '').trim(),
  };
}

export async function validateDoctorProfileForm(form) {
  const result = await validateFrenchAddress({
    postalCode: form.medical_center_postal_code,
    city: form.medical_center_city,
    address: form.medical_center_address,
  });
  return result.valid ? null : result.error;
}

export async function saveDoctorProfile(apiClient, form) {
  const validationError = await validateDoctorProfileForm(form);
  if (validationError) {
    const err = new Error(validationError);
    err.isValidation = true;
    throw err;
  }

  await apiClient.patch('/users/me/', buildDoctorProfilePayload(form));
  const res = await apiClient.get('/auth/me/');
  return res.data;
}
