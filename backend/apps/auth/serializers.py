from django.conf import settings
from django.contrib.auth import get_user_model

import jwt
from rest_framework import serializers
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from apps.profiles.models import Profile, Role
from apps.users.models import User

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

    # Doctor specific fields
    license_number = serializers.CharField(required=False, allow_blank=True)
    specialty = serializers.CharField(required=False, allow_blank=True)
    medical_center_address = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = AuthAccount
        fields = [
            "email",
            "first_name",
            "last_name",
            "role",
            "password",
            "password_confirm",
            "license_number",
            "specialty",
            "medical_center_address",
        ]

    def validate_email(self, value):
        if AuthAccount.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value.lower()

    def validate_role(self, value):
        allowed_public = ("PATIENT", "DOCTOR")
        if value not in allowed_public:
            raise serializers.ValidationError(
                "Seuls les rôles PATIENT et DOCTOR sont autorisés à l'inscription. "
                "Les comptes admin/superadmin sont créés par un superadmin."
            )
        if not Role.objects.filter(name=value).exists():
            raise serializers.ValidationError(f"Rôle '{value}' inexistant.")
        return value

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )

        if data.get("role") == "DOCTOR":
            if not data.get("license_number"):
                raise serializers.ValidationError(
                    {
                        "license_number": "Le numéro RPPS est obligatoire pour les médecins."
                    }
                )
            if not data.get("specialty"):
                raise serializers.ValidationError(
                    {"specialty": "La spécialité est obligatoire."}
                )

        return data

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        role_name = validated_data.pop("role", "PATIENT")
        first_name = validated_data.pop("first_name")
        last_name = validated_data.pop("last_name")

        # Extract doctor fields
        license_number = validated_data.pop("license_number", None)
        specialty_name = validated_data.pop("specialty", None)
        medical_center_address = validated_data.pop("medical_center_address", None)

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
        # Ceci déclenche le signal qui crée DoctorProfile avec un license_number TEMP
        profile = Profile.objects.create(user=user_identity, role=role_obj)

        if role_name == "DOCTOR" and license_number:
            try:
                # Récupérer le profil créé par le signal
                from apps.doctors.models import DoctorProfile

                doctor_profile = DoctorProfile.objects.get(profile=profile)

                # Mise à jour RPPS
                doctor_profile.license_number = license_number

                # Mise à jour Spécialité
                if specialty_name:
                    from apps.doctors.models import Specialty

                    specialty_obj, _ = Specialty.objects.get_or_create(
                        name=specialty_name,
                        defaults={"description": "Auto-created during registration"},
                    )
                    doctor_profile.specialty = specialty_obj

                if medical_center_address:
                    doctor_profile.medical_center_address = medical_center_address

                doctor_profile.save()

            except DoctorProfile.DoesNotExist:
                # Fallback manuel si le signal a échoué (peu probable)
                pass

        return account


class CreateAdminAccountSerializer(serializers.Serializer):
    """Création d'un compte ADMIN ou SUPERADMIN (réservé au superadmin)."""

    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )
    account_type = serializers.ChoiceField(
        choices=[("ADMIN", "Admin"), ("SUPERADMIN", "Superadmin")],
        required=True,
    )

    def validate_email(self, value):
        value = value.lower()
        if AuthAccount.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def validate(self, data):
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )
        return data


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )

    def validate(self, data):
        email = (data.get("email") or "").strip().lower()
        password = data.get("password")

        try:
            account = AuthAccount.objects.get(email__iexact=email)
        except AuthAccount.DoesNotExist:
            raise serializers.ValidationError({"email": "Identifiants incorrects."})

        if not account.check_password(password):
            raise serializers.ValidationError({"password": "Identifiants incorrects."})

        if not account.is_active:
            raise serializers.ValidationError({"email": "Ce compte est désactivé."})

        # Vérification du statut pour les médecins
        # Vérification du statut pour les médecins
        # On regarde si l'utilisateur a un profil DOCTOR
        user_profile = account.user.profiles.filter(role__name="DOCTOR").first()

        if user_profile and hasattr(user_profile, "doctor_profile"):
            doctor_profile = user_profile.doctor_profile
            # Par défaut, si status est manquant, on bloque par sécurité
            if (
                not doctor_profile.verification_status
                or doctor_profile.verification_status.label != "VERIFIED"
            ):
                raise serializers.ValidationError(
                    {
                        "non_field_errors": "Votre compte médecin n'a pas encore été validé par un administrateur."
                    }
                )

        data["user"] = account
        return data


from apps.users.serializers import ProfileSerializer


class UserIdentitySerializer(serializers.ModelSerializer):
    profiles = ProfileSerializer(many=True, read_only=True)

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

        # Admin et superadmin : jetons signés avec SECRET_KEY_ADMIN (validation via JWTAuthenticationDualKey).
        # Patient et docteur : jetons signés avec SECRET_KEY.
        admin_key = getattr(settings, "SECRET_KEY_ADMIN", None)
        if admin_key and (
            "ADMIN" in roles or "SUPERADMIN" in roles or auth_account.is_superuser
        ):
            algo = getattr(api_settings, "ALGORITHM", "HS256")
            access_str = jwt.encode(access.payload, admin_key, algorithm=algo)
            refresh_str = jwt.encode(refresh.payload, admin_key, algorithm=algo)
            return {
                "access": access_str
                if isinstance(access_str, str)
                else access_str.decode(),
                "refresh": refresh_str
                if isinstance(refresh_str, str)
                else refresh_str.decode(),
                "user": AuthAccountSerializer(auth_account).data,
            }

        return {
            "access": str(access),
            "refresh": str(refresh),
            "user": AuthAccountSerializer(auth_account).data,
        }
