"""Vérification d'accès : médecin ou proche vérifié + patient dans l'équipe de soins (ACTIVE)."""

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
            {
                "error": "Access denied. You are not an active doctor for this patient."
            },
            status=403,
        )

    try:
        patient_user = AuthAccount.objects.get(user__pk=patient_user_id)
        return patient_user, None
    except (AuthAccount.DoesNotExist, ValidationError):
        return None, Response(
            {"error": "Patient user or account_auth not found"}, status=404
        )


_PROCHE_ROLES = {"FAMILY", "CAREGIVER", "NURSE"}


def verify_proche_can_access_patient(request):
    """
    Retourne (patient_auth_account, care_team_entry, None) si le proche connecté
    a un lien ACTIVE vers un patient, sinon (None, None, Response d'erreur).

    Le proche n'a pas besoin de passer de patient_user_id : son patient est dérivé
    automatiquement depuis PatientCareTeam.
    """
    proche_user = _get_identity(request.user)
    if not proche_user:
        return None, None, Response({"error": "Authentification requise."}, status=401)

    has_proche_role = proche_user.profiles.filter(
        role__name__in=_PROCHE_ROLES
    ).exists()
    if not has_proche_role:
        return None, None, Response(
            {"error": "Accès réservé aux proches (FAMILY, CAREGIVER, NURSE)."},
            status=403,
        )

    entry = (
        PatientCareTeam.objects.select_related(
            "patient_profile__profile__user",
            "patient_profile__profile",
        )
        .filter(
            member_profile__user=proche_user,
            role__in=_PROCHE_ROLES,
            status__label="ACTIVE",
        )
        .first()
    )
    if not entry:
        return None, None, Response(
            {"error": "Aucun patient lié et actif trouvé pour ce proche."},
            status=403,
        )

    try:
        patient_auth = AuthAccount.objects.get(
            user=entry.patient_profile.profile.user
        )
        return patient_auth, entry, None
    except AuthAccount.DoesNotExist:
        return None, None, Response(
            {"error": "Compte patient introuvable."}, status=404
        )
