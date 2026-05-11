"""Vérification : médecin vérifié + patient dans l'équipe de soins (ACTIVE, rôle médecin)."""

from django.core.exceptions import ValidationError

from rest_framework.response import Response

from apps.doctors.models import PatientCareTeam
from apps.users.models import AuthAccount


def _get_identity(user_obj):
    return getattr(user_obj, "user", None) or user_obj


def verify_doctor_can_access_patient(request, patient_user_id=None):
    """
    Retourne (patient_auth_account, None) si le médecin connecté a accès au patient,
    sinon (None, Response d'erreur).
    """
    if not patient_user_id:
        patient_user_id = (
            request.query_params.get("patient_user_id")
            or request.query_params.get("patient_id")
            or request.data.get("patient_user_id")
            or request.data.get("patient_id")
        )
    if not patient_user_id:
        return None, Response({"error": "patient_user_id is required"}, status=400)

    doctor_user = _get_identity(request.user)
    doctor_role = (
        doctor_user.profiles.filter(role__name__iexact="DOCTOR").first()
        if doctor_user
        else None
    )

    if not doctor_role:
        return None, Response({"error": "Access denied. Doctors only."}, status=403)

    if not hasattr(doctor_role, "doctor_profile"):
        return None, Response({"error": "Access denied. Doctors only."}, status=403)

    try:
        can_access = PatientCareTeam.objects.filter(
            member_profile=doctor_role,
            patient_profile__profile__user__id_user=patient_user_id,
            status__label="ACTIVE",
            role__in=["REFERENT_DOCTOR", "SPECIALIST"],
        ).exists()
    except ValidationError:
        return None, Response(
            {"error": "Invalid patient_user_id format (UUID required)."}, status=400
        )

    if not can_access:
        return None, Response(
            {"error": "Access denied. You are not an active doctor for this patient."},
            status=403,
        )

    try:
        patient_user = AuthAccount.objects.get(user__pk=patient_user_id)
        return patient_user, None
    except (AuthAccount.DoesNotExist, ValidationError):
        return None, Response(
            {"error": "Patient user or account_auth not found"}, status=404
        )
