"""
API pour admin/superadmin : valider les comptes docteurs (accepter / refuser avec message).
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.utils import timezone
import uuid

from apps.doctors.models import DoctorProfile, VerificationStatus
from apps.doctors.serializers import DoctorSerializer
from apps.doctors.utils import send_doctor_verification_result_email


def _is_staff_or_superuser(user):
    """Vérifie que l'utilisateur est admin ou superadmin (AuthAccount)."""
    return getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)


class IsStaffOrSuperuser(IsAuthenticated):
    """Permission : accès réservé aux comptes is_staff ou is_superuser."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return _is_staff_or_superuser(request.user)


class DoctorVerificationViewSet(viewsets.ViewSet):
    """
    ViewSet pour admin/superadmin : liste des docteurs en attente, accepter, refuser.
    - GET  /api/doctors/verification/pending/  → liste des docteurs PENDING
    - POST /api/doctors/verification/<doctor_id>/accept/  → passer en VERIFIED
    - POST /api/doctors/verification/<doctor_id>/decline/  → passer en REJECTED + message
    """
    permission_classes = [IsStaffOrSuperuser]

    def list(self, request):
        """Liste des docteurs en attente de vérification (PENDING)."""
        try:
            pending_status = VerificationStatus.objects.get(label="PENDING")
        except VerificationStatus.DoesNotExist:
            return Response({"results": []})
        doctors = DoctorProfile.objects.filter(verification_status=pending_status).select_related(
            "profile", "profile__user", "verification_status", "specialty"
        )
        serializer = DoctorSerializer(doctors, many=True)
        return Response({"results": serializer.data})

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        """
        Accepter un docteur : statut → VERIFIED, verified_by et verified_at renseignés.
        """
        try:
            uuid.UUID(str(pk))
        except (ValueError, TypeError):
            return Response({"error": "doctor_id invalide (UUID requis)."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            doctor = DoctorProfile.objects.get(doctor_id=pk)
        except DoctorProfile.DoesNotExist:
            return Response(
                {"error": "Profil docteur introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            verified_status = VerificationStatus.objects.get(label="VERIFIED")
        except VerificationStatus.DoesNotExist:
            verified_status, _ = VerificationStatus.objects.get_or_create(
                label="VERIFIED", defaults={"label": "VERIFIED"}
            )
        if doctor.verification_status.label == "VERIFIED":
            return Response(
                {"error": "Ce docteur est déjà validé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            doctor.verification_status = verified_status
            doctor.verified_by_user = request.user
            doctor.verified_at = timezone.now()
            doctor.rejection_reason = None
            doctor.save(update_fields=["verification_status", "verified_by_user", "verified_at", "rejection_reason"])

        # Notification Email
        try:
            email = doctor.profile.user.auth_account.email
            send_doctor_verification_result_email(email, is_accepted=True)
        except Exception:
            pass # L'email ne doit pas bloquer la transaction

        return Response(
            {"message": "Docteur validé.", "verification_status": "VERIFIED"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="decline")
    def decline(self, request, pk=None):
        """
        Refuser un docteur : statut → REJECTED, rejection_reason = message du body.
        Body: { "rejection_reason": "Message optionnel" }
        """
        try:
            uuid.UUID(str(pk))
        except (ValueError, TypeError):
            return Response({"error": "doctor_id invalide (UUID requis)."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            doctor = DoctorProfile.objects.get(doctor_id=pk)
        except DoctorProfile.DoesNotExist:
            return Response(
                {"error": "Profil docteur introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            rejected_status = VerificationStatus.objects.get(label="REJECTED")
        except VerificationStatus.DoesNotExist:
            rejected_status, _ = VerificationStatus.objects.get_or_create(
                label="REJECTED", defaults={"label": "REJECTED"}
            )
        rejection_reason = (request.data.get("rejection_reason") or "").strip()
        with transaction.atomic():
            doctor.verification_status = rejected_status
            doctor.verified_by_user = request.user
            doctor.verified_at = timezone.now()
            doctor.rejection_reason = rejection_reason or None
            doctor.save(update_fields=["verification_status", "verified_by_user", "verified_at", "rejection_reason"])

        # Notification Email
        try:
            email = doctor.profile.user.auth_account.email
            send_doctor_verification_result_email(email, is_accepted=False, rejection_reason=rejection_reason)
        except Exception:
            pass

        return Response(
            {"message": "Demande refusée.", "verification_status": "REJECTED"},
            status=status.HTTP_200_OK,
        )
