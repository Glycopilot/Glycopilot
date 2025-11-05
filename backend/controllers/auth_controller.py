"""
Contrôleur pour l'authentification
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from serializers.auth_serializer import (
    AuthResponseSerializer,
    LoginSerializer,
    RegisterSerializer,
)


@api_view(["POST"])
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
        "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
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
        "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
        "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
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
        "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
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
    except Exception as e:
        return Response(
            {"error": "Token invalide ou expiré."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


@api_view(["POST"])
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
        token.blacklist()

        return Response(
            {"message": "Déconnexion réussie."}, status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {"error": "Token invalide."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
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
    from serializers.auth_serializer import UserSerializer

    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)
