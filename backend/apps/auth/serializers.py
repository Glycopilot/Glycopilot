import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

import jwt
from django.db import IntegrityError
from rest_framework import serializers
from utils.api_messages import EMAIL_ALREADY_USED
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from apps.profiles.models import Profile, Role
from apps.users.models import User

AuthAccount = get_user_model()
logger = logging.getLogger(__name__)


def _verify_email_domain(email: str) -> None:
    """
    Vérifie que le domaine de l'email possède un enregistrement MX valide.
    Lève ValidationError si le domaine n'existe pas ou ne peut pas recevoir d'emails.
    En cas d'erreur réseau (timeout, DNS indisponible), laisse passer sans bloquer.
    """
    try:
        import dns.resolver
        import dns.exception

        domain = email.split("@")[1]
        if "." not in domain:
            raise serializers.ValidationError(
                "Cette adresse email n'existe pas ou son domaine ne peut pas recevoir d'emails."
            )
        try:
            resolver = dns.resolver.Resolver()
            resolver.nameservers = ["8.8.8.8", "1.1.1.1"]
            resolver.resolve(domain, "MX", lifetime=3.0)
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers):
            raise serializers.ValidationError(
                "Cette adresse email n'existe pas ou son domaine ne peut pas recevoir d'emails."
            )
        except (dns.resolver.Timeout, dns.exception.DNSException):
            # Réseau indisponible ou timeout → on laisse passer pour ne pas bloquer l'inscription
            logger.warning(f"DNS lookup timeout for domain: {email.split('@')[1]}")
    except ImportError:
        logger.warning("dnspython not installed, skipping MX check")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=12,
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
    medical_center_name = serializers.CharField(required=False, allow_blank=True)
    medical_center_address = serializers.CharField(required=False, allow_blank=True)
    medical_center_postal_code = serializers.CharField(required=False, allow_blank=True)
    medical_center_city = serializers.CharField(required=False, allow_blank=True)

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
            "medical_center_name",
            "medical_center_address",
            "medical_center_postal_code",
            "medical_center_city",
        ]

    def validate_email(self, value):
        value = value.lower()
        if AuthAccount.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(EMAIL_ALREADY_USED)
        _verify_email_domain(value)
        return value

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

    def validate_password(self, value):
        validate_password(value)
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
            if not data.get("medical_center_name"):
                raise serializers.ValidationError(
                    {"medical_center_name": "La structure est obligatoire."}
                )

            if not data.get("medical_center_city"):
                raise serializers.ValidationError(
                    {"medical_center_city": "La ville est obligatoire."}
                )

            from apps.doctors.france_address import (
                validate_postal_city_match,
                validate_street_address_in_ban,
            )
            from apps.doctors.validators import (
                normalize_postal_code,
                validate_doctor_specialty,
                validate_doctor_structure,
            )
            from rest_framework.exceptions import ValidationError as DRFValidationError

            try:
                validate_doctor_specialty(data["specialty"])
                validate_doctor_structure(data["medical_center_name"])
                postal = normalize_postal_code(data.get("medical_center_postal_code"))
                data["medical_center_postal_code"] = postal
                data["medical_center_city"] = validate_postal_city_match(
                    postal, data["medical_center_city"]
                )
                if not data.get("medical_center_address"):
                    raise serializers.ValidationError(
                        {"medical_center_address": "L'adresse est obligatoire."}
                    )
                data["medical_center_address"] = validate_street_address_in_ban(
                    postal,
                    data["medical_center_city"],
                    data["medical_center_address"],
                )
            except DRFValidationError as exc:
                raise serializers.ValidationError(exc.detail)

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
        medical_center_name = validated_data.pop("medical_center_name", None)
        medical_center_address = validated_data.pop("medical_center_address", None)
        medical_center_postal_code = validated_data.pop("medical_center_postal_code", None)
        medical_center_city = validated_data.pop("medical_center_city", None)

        email = validated_data["email"]

        user_identity = User.objects.create(
            first_name=first_name,
            last_name=last_name,
        )

        try:
            account = AuthAccount.objects.create_user(
                email=email,
                password=password,
                user_identity=user_identity,
            )
        except IntegrityError as exc:
            if "email" in str(exc).lower() or "auth_accounts" in str(exc).lower():
                raise serializers.ValidationError({"email": EMAIL_ALREADY_USED}) from exc
            raise

        role_obj = Role.objects.get(name=role_name)
        # Ceci déclenche le signal qui crée DoctorProfile avec un license_number TEMP
        profile = Profile.objects.create(user=user_identity, role=role_obj)

        if role_name == "DOCTOR" and license_number:
            try:
                from apps.doctors.models import DoctorProfile
                from apps.doctors.services.profile_update import apply_doctor_profile_fields

                doctor_profile = DoctorProfile.objects.get(profile=profile)
                doctor_profile.license_number = license_number
                doctor_profile.save(update_fields=["license_number"])

                apply_doctor_profile_fields(
                    doctor_profile,
                    specialty=specialty_name,
                    medical_center_name=medical_center_name,
                    medical_center_address=medical_center_address or "",
                    medical_center_postal_code=medical_center_postal_code,
                    medical_center_city=medical_center_city,
                )

            except DoctorProfile.DoesNotExist:
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
        min_length=12,
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
        if AuthAccount.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(EMAIL_ALREADY_USED)
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

        # Médecin : connexion bloquée tant que verification_status = VERIFIED
        # (cocher « actif » sur AuthAccount / Profile ne suffit pas)
        user_profile = (
            account.user.profiles.filter(role__name="DOCTOR")
            .select_related("doctor_profile__verification_status")
            .first()
        )

        if user_profile and hasattr(user_profile, "doctor_profile"):
            doctor_profile = user_profile.doctor_profile
            status_label = (
                doctor_profile.verification_status.label
                if doctor_profile.verification_status_id
                else None
            )
            if status_label != "VERIFIED":
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
