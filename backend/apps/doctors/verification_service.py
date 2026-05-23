"""Validation des comptes médecin (licence RPPS) — source unique pour admin et API."""

from django.utils import timezone

from apps.doctors.models import DoctorProfile, VerificationStatus


def get_verified_status() -> VerificationStatus:
    try:
        return VerificationStatus.objects.get(label="VERIFIED")
    except VerificationStatus.DoesNotExist:
        return VerificationStatus.objects.create(label="VERIFIED")


def verify_doctor_profile(doctor: DoctorProfile, *, verified_by=None) -> bool:
    """
    Passe un DoctorProfile en VERIFIED.
    Retourne True si le statut a été modifié, False si déjà VERIFIED.
    """
    verified_status = get_verified_status()
    if doctor.verification_status_id == verified_status.pk:
        return False

    doctor.verification_status = verified_status
    doctor.verified_by_user = verified_by
    doctor.verified_at = timezone.now()
    doctor.rejection_reason = None
    doctor.save(
        update_fields=[
            "verification_status",
            "verified_by_user",
            "verified_at",
            "rejection_reason",
        ]
    )
    return True


def verify_doctors_for_auth_accounts(queryset, *, verified_by=None) -> int:
    """Valide les profils médecin liés aux comptes AuthAccount sélectionnés."""
    from django.contrib.auth import get_user_model

    AuthAccount = get_user_model()
    count = 0
    accounts = queryset if hasattr(queryset, "filter") else AuthAccount.objects.filter(pk__in=queryset)
    for account in accounts.select_related("user"):
        profile = account.user.profiles.filter(role__name="DOCTOR").first()
        if not profile or not hasattr(profile, "doctor_profile"):
            continue
        if verify_doctor_profile(profile.doctor_profile, verified_by=verified_by):
            count += 1
    return count
