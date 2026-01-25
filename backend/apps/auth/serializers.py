import os

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

from apps.users.models import User
from apps.profiles.models import Profile, Role

AuthAccount = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )
    role = serializers.CharField(required=False, default="PATIENT")
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)

    class Meta:
        model = AuthAccount
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "password",
            "password_confirm",
        ]

    def validate_email(self, value):
        if AuthAccount.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value.lower()

    def validate_role(self, value):
        if not Role.objects.filter(name=value).exists():
            raise serializers.ValidationError(f"Role '{value}' does not exist.")
        return value

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )
        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        role_name = validated_data.pop("role", "PATIENT")
        first_name = validated_data.pop("first_name")
        last_name = validated_data.pop("last_name")
        
        email = validated_data["email"]

        user_identity = User.objects.create(
            first_name=first_name,
            last_name=last_name,
        )

        account = AuthAccount.objects.create_user(
            email=email,
            password=password,
            user_identity=user_identity,
        )

        role_obj = Role.objects.get(name=role_name)
        Profile.objects.create(user=user_identity, role=role_obj)
        
        return account


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )

    def validate(self, data):
        email = data.get("email").lower()
        password = data.get("password")

        try:
            account = AuthAccount.objects.get(email=email)
        except AuthAccount.DoesNotExist:
            raise serializers.ValidationError({"email": "Identifiants incorrects."})

        if not account.check_password(password):
            raise serializers.ValidationError({"password": "Identifiants incorrects."})

        if not account.is_active:
            raise serializers.ValidationError({"email": "Ce compte est désactivé."})

        data["user"] = account
        return data


from apps.profiles.models import PatientProfile
from apps.doctors.models import DoctorProfile

class TinyPatientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientProfile
        fields = ["diabetes_type", "diagnosis_date"]

class TinyDoctorProfileSerializer(serializers.ModelSerializer):
    verification_status = serializers.StringRelatedField()
    specialty = serializers.StringRelatedField()
    class Meta:
        model = DoctorProfile
        fields = ["license_number", "verification_status", "specialty", "medical_center_name"]

class SimpleProfileSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    patient_details = TinyPatientProfileSerializer(source='patient_profile', read_only=True)
    doctor_details = TinyDoctorProfileSerializer(source='doctor_profile', read_only=True)
    
    class Meta:
        model = Profile
        fields = ["id_profile", "role_name", "label", "is_active", "patient_details", "doctor_details", "created_at"]

class UserIdentitySerializer(serializers.ModelSerializer):
    profiles = SimpleProfileSerializer(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = ["id_user", "first_name", "last_name", "created_at", "profiles"]


class AuthAccountSerializer(serializers.ModelSerializer):
    identity = UserIdentitySerializer(source="user", read_only=True)

    class Meta:
        model = AuthAccount
        fields = ["id_auth", "email", "identity", "created_at"]


class AuthResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = AuthAccountSerializer()

    @staticmethod
    def get_tokens_for_user(auth_account):
        refresh = RefreshToken.for_user(auth_account)

        identity = auth_account.user
        roles = list(identity.profiles.values_list("role__name", flat=True))
        primary_role = roles[0] if roles else None

        refresh["role"] = primary_role

        access = refresh.access_token
        access["role"] = primary_role
        

        if "ADMIN" in roles or "SUPERADMIN" in roles or auth_account.is_superuser:
            admin_key = os.environ.get("SECRET_KEY_ADMIN")
            if admin_key:
                refresh.access_token.set_signature_key(admin_key)
                refresh.set_signature_key(admin_key)

        return {
            "access": str(access),
            "refresh": str(refresh),
            "user": AuthAccountSerializer(auth_account).data,
        }
