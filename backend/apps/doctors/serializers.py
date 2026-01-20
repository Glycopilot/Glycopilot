from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Doctor

User = get_user_model()


class SimpleUserSerializer(serializers.ModelSerializer):
    """
    Display user details.
    """
    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "phone_number",
        ]  # Basic info


class DoctorSerializer(serializers.ModelSerializer):
    """
    Display doctor profile info + patient details .
    """
    user_details = SimpleUserSerializer(source="user", read_only=True)

    class Meta:
        model = Doctor
        fields = ["licence_number", "adresse_pro", "user_details", "valide"]


# DoctorPatientSerializer removed as relation is now direct in User model via medical_id


class PatientListByDoctorSerializer(serializers.Serializer):
    """
    Serializer helper for structuring the 'patients per doctor' list.
    """
    doctor = DoctorSerializer()
    patients = SimpleUserSerializer(many=True)


class DoctorListWithPatientsSerializer(serializers.Serializer):
    """
    Serializer helper for structuring the 'doctors with their patients' list.
    """
    doctor = DoctorSerializer()
    patients = SimpleUserSerializer(many=True)
