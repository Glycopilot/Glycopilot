from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.profiles.models import Profile

from .models import User
from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def _is_admin(self, user):
        # user = AuthAccount. Admin/superadmin ont accès étendu.
        if getattr(user, "is_superuser", False):
            return True
        if hasattr(user, "user"):
            return user.user.profiles.filter(
                role__name__in=["ADMIN", "SUPERADMIN"]
            ).exists()
        return False

    def get_queryset(self):
        user = self.request.user
        if self._is_admin(user):
            return User.objects.all().order_by("id_user")
        return User.objects.filter(id_user=user.user.id_user).order_by("id_user")

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        """
        Accessible via /api/users/me/.
        """
        # request.user is an AuthAccount instance
        # We need the related User Identity instance
        user_identity = request.user.user

        if request.method == "PATCH":
            data = request.data.copy()
            medical_id = data.pop("medical_id", None)
            patient_details = data.pop("patient_details", None)

            # Mise à jour patient_details (diabète, date diagnostic)
            if patient_details:
                patient_role_profile = user_identity.profiles.filter(
                    role__name="PATIENT"
                ).first()
                if patient_role_profile and hasattr(
                    patient_role_profile, "patient_profile"
                ):
                    p_profile = patient_role_profile.patient_profile
                    if "diabetes_type" in patient_details:
                        p_profile.diabetes_type = patient_details["diabetes_type"]
                    if "diagnosis_date" in patient_details:
                        p_profile.diagnosis_date = patient_details["diagnosis_date"]
                    p_profile.save()

            # Lien patient → docteur (PatientCareTeam, base de données)
            if medical_id:
                from rest_framework.exceptions import NotFound, ValidationError

                from apps.doctors.models import (
                    DoctorProfile,
                    InvitationStatus,
                    PatientCareTeam,
                )

                try:
                    patient_profile_obj = user_identity.profiles.get(
                        role__name="PATIENT"
                    )
                except Profile.DoesNotExist:
                    raise ValidationError("L'utilisateur n'a pas de profil patient.")

                try:
                    doctor = DoctorProfile.objects.get(license_number=medical_id)
                except DoctorProfile.DoesNotExist:
                    raise NotFound("Aucun médecin trouvé avec l'identifiant fourni.")

                pending_status, _ = InvitationStatus.objects.get_or_create(
                    label="PENDING"
                )
                if not PatientCareTeam.objects.filter(
                    patient_profile=patient_profile_obj.patient_profile,
                    member_profile=doctor.profile,
                ).exists():
                    PatientCareTeam.objects.create(
                        patient_profile=patient_profile_obj.patient_profile,
                        member_profile=doctor.profile,
                        role="REFERENT_DOCTOR",
                        status=pending_status,
                    )

            serializer = self.get_serializer(user_identity, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)

        serializer = self.get_serializer(user_identity)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        if self._is_admin(user):
            serializer.save()
        else:
            raise PermissionDenied(
                "Seuls les administrateurs peuvent créer des utilisateurs."
            )

    def perform_update(self, serializer):
        user = self.request.user
        if self._is_admin(user):
            serializer.save()
        # Verify ownership: serializer.instance (User) should match user.user (User)
        elif hasattr(user, "user") and serializer.instance.pk == user.user.pk:
            serializer.save()
        else:
            raise PermissionDenied("Accès refusé.")
