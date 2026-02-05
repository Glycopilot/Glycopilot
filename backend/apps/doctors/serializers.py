from rest_framework import serializers
from apps.users.models import User
from .models import DoctorProfile, VerificationStatus, PatientCareTeam


class SimpleUserSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id_user",
            "first_name",
            "last_name",
            "email",
            "phone_number",
        ]

    def get_email(self, obj):
        try:
            return obj.auth_account.email
        except:
            return None


class DoctorSerializer(serializers.ModelSerializer):
    profile_id = serializers.SerializerMethodField()
    user_details = serializers.SerializerMethodField()
    valide = serializers.SerializerMethodField()
    verification_status = serializers.StringRelatedField() # serialize label
    specialty = serializers.StringRelatedField() # serialize name

    class Meta:
        model = DoctorProfile
        fields = [
            "doctor_id",
            "profile_id",
            "license_number",
            "verification_status",
            "verified_at",
            "rejection_reason",
            "medical_center_name",
            "medical_center_address",
            "specialty",
            "user_details",
            "valide",
        ]

    def get_profile_id(self, obj):
        return str(obj.profile.id_profile) if obj.profile else None

    def get_user_details(self, obj):
        return SimpleUserSerializer(obj.profile.user).data

    def get_valide(self, obj):
        return obj.verification_status.label == "VERIFIED"


class PatientCareTeamSerializer(serializers.ModelSerializer):
    member_details = serializers.SerializerMethodField()
    role_label = serializers.CharField(source="get_role_display", read_only=True)
    
    def get_member_details(self, obj):
        if obj.member_profile and obj.member_profile.user:
            return SimpleUserSerializer(obj.member_profile.user).data
        return None
    
    class Meta:
        model = PatientCareTeam
        fields = [
            "id_team_member", 
            "patient_profile", 
            "member_profile", 
            "member_details",
            "invitation_email",
            "role", 
            "role_label",
            "relation_type",
            "status", 
            "approved_by"
        ]

class DoctorListWithPatientsSerializer(serializers.Serializer):
    doctor = DoctorSerializer()
    patients = SimpleUserSerializer(many=True)
