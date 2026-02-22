from rest_framework import serializers

from apps.doctors.serializers import DoctorSerializer, PatientCareTeamSerializer
from apps.profiles.models import PatientProfile, Profile

from .models import User


class PatientProfileSerializer(serializers.ModelSerializer):
    care_team = PatientCareTeamSerializer(
        source="care_team_members", many=True, read_only=True
    )

    class Meta:
        model = PatientProfile
        fields = ["diabetes_type", "diagnosis_date", "care_team"]


class ProfileSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    patient_details = PatientProfileSerializer(
        source="patient_profile", required=False, allow_null=True
    )
    doctor_details = DoctorSerializer(
        source="doctor_profile", required=False, allow_null=True
    )

    class Meta:
        model = Profile
        fields = [
            "id_profile",
            "role_name",
            "label",
            "is_active",
            "patient_details",
            "doctor_details",
            "created_at",
        ]

    def update(self, instance, validated_data):
        patient_data = validated_data.pop("patient_profile", None)

        # Mise à jour des champs du profil
        instance = super().update(instance, validated_data)

        # Mise à jour du profil patient imbriqué
        if patient_data and hasattr(instance, "patient_profile"):
            patient_profile = instance.patient_profile
            for attr, value in patient_data.items():
                setattr(patient_profile, attr, value)
            patient_profile.save()

        return instance


class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="auth_account.email", read_only=True)
    profiles = ProfileSerializer(many=True, required=False)
    patient_details = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id_user",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "address",
            "profiles",
            "created_at",
            "patient_details",
        ]
        read_only_fields = [
            "id_user",
            "email",
            "created_at",
            "patient_details",
        ]

    def get_patient_details(self, obj):
        # Récupérer le profil patient s'il existe
        profile = obj.profiles.filter(role__name="PATIENT").first()
        if profile and hasattr(profile, "patient_profile"):
            return PatientProfileSerializer(profile.patient_profile).data
        return None

    def update(self, instance, validated_data):
        profiles_data = validated_data.pop("profiles", [])

        # Mise à jour des champs utilisateur
        instance = super().update(instance, validated_data)

        # Gestion de la mise à jour des profils si nécessaire
        if profiles_data:
            # Implémentation future si besoin de mise à jour groupée
            pass

        return instance
