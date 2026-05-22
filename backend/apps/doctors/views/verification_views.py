import uuid

from django.db import transaction
from django.utils import timezone

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.doctors.models import DoctorProfile, VerificationStatus
from apps.doctors.serializers import DoctorSerializer
from apps.doctors.utils import send_doctor_verification_result_email
from apps.doctors.verification_service import get_verified_status, verify_doctor_profile


def _is_staff_or_superuser(user):
    return getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)


def _resolve_doctor_profile(pk):
    try:
        uid = uuid.UUID(str(pk))
    except (ValueError, TypeError):
        return None, (
            {"error": "doctor_id invalide (UUID requis)."},
            status.HTTP_400_BAD_REQUEST,
        )
    doctor = DoctorProfile.objects.filter(doctor_id=uid).first()
    if doctor is None:
        doctor = DoctorProfile.objects.filter(profile_id=uid).first()
    if doctor is None:
        return None, (
            {"error": "Profil docteur introuvable."},
            status.HTTP_404_NOT_FOUND,
        )
    return doctor, None


class IsStaffOrSuperuser(IsAuthenticated):
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return _is_staff_or_superuser(request.user)


class DoctorVerificationViewSet(viewsets.ViewSet):
    permission_classes = [IsStaffOrSuperuser]

    def list(self, request):
        try:
            pending_status = VerificationStatus.objects.get(label="PENDING")
        except VerificationStatus.DoesNotExist:
            return Response({"results": []})
        doctors = DoctorProfile.objects.filter(
            verification_status=pending_status
        ).select_related("profile", "profile__user", "verification_status", "specialty")
        serializer = DoctorSerializer(doctors, many=True)
        return Response({"results": serializer.data})

    @action(detail=True, methods=["post"], url_path="accept")
    def accept(self, request, pk=None):
        doctor, err = _resolve_doctor_profile(pk)
        if err:
            body, code = err
            return Response(body, status=code)
        verified_status = get_verified_status()
        if doctor.verification_status_id == verified_status.pk:
            return Response(
                {"error": "Ce docteur est déjà validé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            verify_doctor_profile(doctor, verified_by=request.user)

        try:
            email = doctor.profile.user.auth_account.email
            send_doctor_verification_result_email(email, is_accepted=True)
        except Exception:
            pass

        return Response(
            {"message": "Docteur validé.", "verification_status": "VERIFIED"},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="decline")
    def decline(self, request, pk=None):
        doctor, err = _resolve_doctor_profile(pk)
        if err:
            body, code = err
            return Response(body, status=code)
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
            doctor.save(
                update_fields=[
                    "verification_status",
                    "verified_by_user",
                    "verified_at",
                    "rejection_reason",
                ]
            )

        try:
            email = doctor.profile.user.auth_account.email
            send_doctor_verification_result_email(
                email, is_accepted=False, rejection_reason=rejection_reason
            )
        except Exception:
            pass

        return Response(
            {"message": "Demande refusée.", "verification_status": "REJECTED"},
            status=status.HTTP_200_OK,
        )
