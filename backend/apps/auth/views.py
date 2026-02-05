"""
Contrôleur pour l'authentification
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.auth.serializers import (
    AuthResponseSerializer,
    LoginSerializer,
    RegisterSerializer,
    AuthAccountSerializer,
    CreateAdminAccountSerializer,
)
from apps.users.models import User, AuthAccount
from apps.profiles.models import Profile, Role
from utils.permissions import allowed_roles


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def register(request):
    """
    Endpoint pour l'inscription d'un nouvel utilisateur

    POST /api/auth/register
    Body:
    {
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "password": "securepassword123",
        "password_confirm": "securepassword123"
    }

    Response 201:
    {
        "access": "<access_token>",
        "refresh": "<refresh_token>",
        "user": {
            "id": 1,
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "created_at": "2025-11-05T21:00:00Z"
        }
    }
    """
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        # Générer les tokens JWT
        tokens = AuthResponseSerializer.get_tokens_for_user(user)

        return Response(tokens, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """
    Endpoint pour la connexion d'un utilisateur

    POST /api/auth/login
    Body:
    {
        "email": "user@example.com",
        "password": "securepassword123"
    }

    Response 200:
    {
        "access": "<access_token>",
        "refresh": "<refresh_token>",
        "user": {
            "id": 1,
            "email": "user@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "created_at": "2025-11-05T21:00:00Z"
        }
    }
    """
    serializer = LoginSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.validated_data["user"]

        # Générer les tokens JWT
        tokens = AuthResponseSerializer.get_tokens_for_user(user)

        return Response(tokens, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def refresh_token(request):
    """
    Endpoint pour rafraîchir le token d'accès

    POST /api/auth/refresh
    Body:
    {
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
    }

    Response 200:
    {
        "access": "<access_token>"
    }
    """
    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return Response(
            {"refresh": "Ce champ est requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        refresh = RefreshToken(refresh_token)
        access_token = str(refresh.access_token)

        return Response({"access": access_token}, status=status.HTTP_200_OK)
    except Exception:
        return Response(
            {"error": "Token invalide ou expiré."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


@api_view(["POST"])
@allowed_roles(["patient", "doctor", "admin", "superadmin"])
def logout(request):
    """
    Endpoint pour déconnecter un utilisateur
    Blacklist le refresh token pour qu'il ne puisse plus être utilisé

    POST /api/auth/logout
    Body:
    {
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
    }

    Response 200:
    {
        "message": "Déconnexion réussie."
    }
    """
    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return Response(
            {"refresh": "Ce champ est requis."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        token = RefreshToken(refresh_token)
        token_user_id = token.payload.get("user_id")

        if token_user_id != request.user.id:
            return Response(
                {"error": "Token ne correspond pas à l'utilisateur connecté."},
                status=status.HTTP_403_FORBIDDEN,
            )

        token.blacklist()

        return Response({"message": "Déconnexion réussie."}, status=status.HTTP_200_OK)
    except Exception:
        return Response(
            {"error": "Token invalide."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_admin_account(request):
    """
    Création d'un compte ADMIN ou SUPERADMIN. Réservé aux superadmins (is_superuser).

    POST /api/auth/create-admin/
    Body: {
        "email": "admin@example.com",
        "first_name": "Admin",
        "last_name": "User",
        "password": "securepassword123",
        "password_confirm": "securepassword123",
        "account_type": "ADMIN"  ou "SUPERADMIN"
    }
    """
    if not getattr(request.user, "is_superuser", False):
        return Response(
            {"error": "Seul un superadmin peut créer des comptes admin ou superadmin."},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = CreateAdminAccountSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    email = data["email"].lower()
    first_name = data["first_name"]
    last_name = data["last_name"]
    password = data["password"]
    account_type = data["account_type"]

    role_obj, _ = Role.objects.get_or_create(name=account_type, defaults={"name": account_type})
    user_identity = User.objects.create(first_name=first_name, last_name=last_name)
    account = AuthAccount.objects.create_user(
        email=email,
        password=password,
        user_identity=user_identity,
        is_staff=True,
        is_superuser=(account_type == "SUPERADMIN"),
    )
    Profile.objects.create(user=user_identity, role=role_obj)

    return Response(
        {
            "message": f"Compte {account_type} créé.",
            "email": email,
            "account_type": account_type,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@allowed_roles(["patient", "doctor", "admin", "superadmin"])
def me(request):
    """
    Endpoint pour obtenir les informations de l'utilisateur connecté

    GET /api/auth/me
    Headers:
        Authorization: Bearer <access_token>

    Response 200:
    {
        "id": 1,
        "email": "user@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "created_at": "2025-11-05T21:00:00Z"
    }
    """
    serializer = AuthAccountSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)
