"""
Serializers pour l'authentification
"""
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from models.user import User


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer pour l'inscription d'un nouvel utilisateur
    """

    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "password",
            "password_confirm",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        """
        Vérifie que l'email n'existe pas déjà
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value.lower()

    def validate(self, data):
        """
        Vérifie que les deux mots de passe correspondent
        """
        if data["password"] != data["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )
        return data

    def create(self, validated_data):
        """
        Crée un nouvel utilisateur avec un mot de passe hashé
        """
        validated_data.pop("password_confirm")
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer pour la connexion d'un utilisateur
    """

    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )

    def validate(self, data):
        """
        Vérifie les identifiants de l'utilisateur
        """
        email = data.get("email").lower()
        password = data.get("password")

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "Identifiants incorrects."})

        if not user.check_password(password):
            raise serializers.ValidationError({"password": "Identifiants incorrects."})

        if not user.is_active:
            raise serializers.ValidationError({"email": "Ce compte est désactivé."})

        data["user"] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer pour les informations utilisateur
    """

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "role", "created_at"]
        read_only_fields = ["id", "email", "role", "created_at"]


class AuthResponseSerializer(serializers.Serializer):
    """
    Serializer pour la réponse d'authentification avec tokens JWT
    """

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()

    @staticmethod
    def get_tokens_for_user(user):
        """
        Génère les tokens JWT pour un utilisateur
        """
        refresh = RefreshToken.for_user(user)
        refresh["role"] = user.role
        access = refresh.access_token
        access["role"] = user.role

        return {
            "access": str(access),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        }
