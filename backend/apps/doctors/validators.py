from rest_framework.exceptions import ValidationError

from .constants import DOCTOR_SPECIALTIES, DOCTOR_STRUCTURES


def normalize_postal_code(value, *, required=True):
    postal = (value or "").strip()
    if not postal:
        if required:
            raise ValidationError({"medical_center_postal_code": "Le code postal est obligatoire."})
        return ""
    if not postal.isdigit() or len(postal) != 5:
        raise ValidationError(
            {"medical_center_postal_code": "Le code postal doit contenir 5 chiffres."}
        )
    return postal


def validate_doctor_specialty(value):
    if value not in DOCTOR_SPECIALTIES:
        raise ValidationError({"specialty": "Spécialité invalide."})
    return value


def validate_doctor_structure(value):
    if value not in DOCTOR_STRUCTURES:
        raise ValidationError({"medical_center_name": "Structure invalide."})
    return value
