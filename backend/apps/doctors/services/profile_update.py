from apps.doctors.france_address import validate_postal_city_match
from apps.doctors.models import DoctorProfile, Specialty
from apps.doctors.validators import (
    normalize_postal_code,
    validate_doctor_specialty,
    validate_doctor_structure,
)


def get_doctor_profile_for_user(user_identity):
    profile = (
        user_identity.profiles.filter(role__name="DOCTOR")
        .select_related("doctor_profile", "doctor_profile__specialty")
        .first()
    )
    if not profile or not hasattr(profile, "doctor_profile"):
        return None
    return profile.doctor_profile


def apply_doctor_profile_fields(
    doctor_profile,
    *,
    specialty=None,
    medical_center_name=None,
    medical_center_address=None,
    medical_center_postal_code=None,
    medical_center_city=None,
):
    if specialty is not None:
        validate_doctor_specialty(specialty)
        spec, _ = Specialty.objects.get_or_create(
            name=specialty,
            defaults={"description": ""},
        )
        doctor_profile.specialty = spec

    if medical_center_name is not None:
        validate_doctor_structure(medical_center_name)
        doctor_profile.medical_center_name = medical_center_name

    if medical_center_address is not None:
        doctor_profile.medical_center_address = medical_center_address

    if medical_center_postal_code is not None:
        postal = normalize_postal_code(medical_center_postal_code)
        doctor_profile.medical_center_postal_code = postal
        if medical_center_city is not None:
            doctor_profile.medical_center_city = validate_postal_city_match(
                postal, medical_center_city
            )
    elif medical_center_city is not None and doctor_profile.medical_center_postal_code:
        doctor_profile.medical_center_city = validate_postal_city_match(
            doctor_profile.medical_center_postal_code,
            medical_center_city,
        )

    doctor_profile.save()
    return doctor_profile


def update_doctor_profile_for_user(user_identity, fields):
    doctor_profile = get_doctor_profile_for_user(user_identity)
    if not doctor_profile:
        return None

    has_update = any(
        fields.get(k) is not None
        for k in (
            "specialty",
            "medical_center_name",
            "medical_center_address",
            "medical_center_postal_code",
            "medical_center_city",
        )
    )
    if not has_update:
        return doctor_profile

    return apply_doctor_profile_fields(
        doctor_profile,
        specialty=fields.get("specialty"),
        medical_center_name=fields.get("medical_center_name"),
        medical_center_address=fields.get("medical_center_address"),
        medical_center_postal_code=fields.get("medical_center_postal_code"),
        medical_center_city=fields.get("medical_center_city"),
    )
