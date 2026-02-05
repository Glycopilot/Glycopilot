from rest_framework import serializers
from .models import User
from apps.profiles.models import Profile, PatientProfile

class PatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ["diabetes_type", "diagnosis_date"]

class ProfileSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    patient_details = PatientProfileSerializer(source='patient_profile', required=False, allow_null=True)
    
    class Meta:
        model = Profile
        fields = ["id_profile", "role_name", "label", "is_active", "patient_details", "created_at"]

    def update(self, instance, validated_data):
        patient_data = validated_data.pop('patient_profile', None)
        
        # Update Profile fields
        instance = super().update(instance, validated_data)

        # Update Nested PatientProfile
        if patient_data and hasattr(instance, 'patient_profile'):
            patient_profile = instance.patient_profile
            for attr, value in patient_data.items():
                setattr(patient_profile, attr, value)
            patient_profile.save()
            
        return instance

class UserSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='auth_account.email', read_only=True)
    profiles = ProfileSerializer(many=True, required=False)

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
        ]
        read_only_fields = [
            "id_user",
            "email",
            "created_at",
        ]

    def update(self, instance, validated_data):
        profiles_data = validated_data.pop('profiles', [])
        
        # Update User fields
        instance = super().update(instance, validated_data)
        
        # Update Profiles if provided (Expecting full object or partial matching by ID potentially? 
        # Actually for 'me' endpoint we usually just want to update the PATIENT profile.
        # But `profiles` is a list. This is tricky with DRF default update.
        # Let's handle it manually if present.
        
        if profiles_data:
            # We iterate over the input profiles
            # Since we don't have IDs in input usually, we might rely on order OR roles.
            # A safer bet for this specific "Complete Profile" requirement is to look for the PATIENT role data.
            
            # However, standard DRF nested update on lists is complex. 
            # Simplification: We assume the user sends the full structure or we filter by role_name if possible.
            # But ProfileSerializer doesn't have role_name writable.
            
            # Alternate strategy used in frontend often: 
            # User sends `patient_details` object to a specific endpoint or we assume single profile update.
            # Given the request is "complete my profile", let's attempt to update the relevant profile.
            pass

        return instance
