from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from .models import User
from .serializers import UserSerializer
from apps.profiles.models import Profile

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def _is_admin(self, user):
        # user is AuthAccount instance
        # Check if superuser or if linked identity has ADMIN profile
        if user.is_superuser:
            return True
        if hasattr(user, 'user'):
            return user.user.profiles.filter(role__name="ADMIN").exists()
        return False

    def get_queryset(self):
        user = self.request.user
        if self._is_admin(user):
            return User.objects.all()
        # Return only the identity of the current user
        return User.objects.filter(id_user=user.user.id_user)

    @action(detail=False, methods=["get", "patch"])
    def me(self, request):
        """
        Accessible via /api/users/me/.
        """
        # request.user is an AuthAccount instance
        # We need the related User Identity instance
        user_identity = request.user.user
        
        if request.method == "PATCH":
            # Copy data to make it mutable
            data = request.data.copy()
            medical_id = data.pop("medical_id", None)
            
            # If medical_id is provided, handle doctor selection
            if medical_id:
                from apps.doctors.models import DoctorProfile, PatientDoctorRelation, InvitationStatus
                from rest_framework.exceptions import ValidationError, NotFound

                try:
                    doctor = DoctorProfile.objects.get(license_number=medical_id)
                except DoctorProfile.DoesNotExist:
                    raise NotFound(f"Aucun médecin trouvé avec l'identifiant {medical_id}")

                # Get the patient profile for the current user
                try:
                    patient_profile_obj = user_identity.profiles.get(role__name="PATIENT")
                except Profile.DoesNotExist:
                     raise ValidationError("L'utilisateur n'a pas de profil patient.")

            # Handle Profile Completion (Diabetes Type, etc.)
            patient_details = data.pop("patient_details", None)
            if patient_details:
                 # Find Patient Role Profile
                 patient_role_profile = user_identity.profiles.filter(role__name="PATIENT").first()
                 if patient_role_profile and hasattr(patient_role_profile, 'patient_profile'):
                     p_profile = patient_role_profile.patient_profile
                     
                     if "diabetes_type" in patient_details:
                         p_profile.diabetes_type = patient_details["diabetes_type"]
                     if "diagnosis_date" in patient_details:
                         p_profile.diagnosis_date = patient_details["diagnosis_date"]
                     p_profile.save()

            # If medical_id is provided, handle doctor selection
            if medical_id:
                # Get the patient profile for the current user (already fetched above or fetch now)
                if not 'patient_profile_obj' in locals():
                     try:
                        patient_profile_obj = user_identity.profiles.get(role__name="PATIENT")
                     except Profile.DoesNotExist:
                         raise ValidationError("L'utilisateur n'a pas de profil patient.")

                from apps.doctors.models import DoctorProfile, PatientCareTeam, InvitationStatus
                from rest_framework.exceptions import ValidationError, NotFound

                try:
                    doctor = DoctorProfile.objects.get(license_number=medical_id)
                except DoctorProfile.DoesNotExist:
                    raise NotFound(f"Aucun médecin trouvé avec l'identifiant {medical_id}")

                # Create or update relation (Association)
                # Patient selects a doctor -> Creates a PENDING request
                pending_status, _ = InvitationStatus.objects.get_or_create(label="PENDING")
                
                # Check if exists
                existing_team = PatientCareTeam.objects.filter(
                    patient_profile=patient_profile_obj.patient_profile,
                    member_profile=doctor.profile
                ).exists()

                if not existing_team:
                    PatientCareTeam.objects.create(
                        patient_profile=patient_profile_obj.patient_profile,
                        member_profile=doctor.profile,
                        role="REFERENT_DOCTOR",
                        status=pending_status
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
        elif hasattr(user, 'user') and serializer.instance.pk == user.user.pk:
            serializer.save()
        else:
            raise PermissionDenied("Accès refusé.")
