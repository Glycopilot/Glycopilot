"""
Contrôleur pour l'authentification
"""

import logging

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from utils.throttles import AuthRateThrottle

from apps.auth.serializers import (
    AuthAccountSerializer,
    AuthResponseSerializer,
    CreateAdminAccountSerializer,
    LoginSerializer,
    RegisterSerializer,
)
from apps.profiles.models import Profile, Role
from apps.users.models import AuthAccount, User
from utils.helpers import format_serializer_errors
from utils.permissions import allowed_roles

logger = logging.getLogger(__name__)


def _send_verification_link(auth_account) -> None:
    """Génère un token de vérification et envoie l'email d'activation."""
    from django.conf import settings
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    from apps.auth.email_smtp import send_verification_email
    from apps.auth.tokens import email_verification_token

    uid = urlsafe_base64_encode(force_bytes(auth_account.pk))
    token = email_verification_token.make_token(auth_account)
    backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8006")
    link = f"{backend_url}/api/auth/confirm-email?uid={uid}&token={token}"
    send_verification_email(auth_account.email, link)


def _send_verification_link(auth_account) -> None:
    """Génère un token de vérification et envoie l'email d'activation."""
    from django.conf import settings
    from django.utils.encoding import force_bytes
    from django.utils.http import urlsafe_base64_encode

    from apps.auth.email_smtp import send_verification_email
    from apps.auth.tokens import email_verification_token

    uid = urlsafe_base64_encode(force_bytes(auth_account.pk))
    token = email_verification_token.make_token(auth_account)
    backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8006")
    link = f"{backend_url}/api/auth/confirm-email?uid={uid}&token={token}"
    send_verification_email(auth_account.email, link)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def register(request):
    """
    POST /api/auth/register
    Crée le compte et envoie un email de vérification.
    Les tokens JWT ne sont délivrés qu'après vérification de l'email.
    """
    serializer = RegisterSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(format_serializer_errors(serializer.errors), status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    is_doctor = user.user.profiles.filter(role__name="DOCTOR").exists()

    if is_doctor:
        return Response(
            {
                "message": "Votre compte médecin a été créé. Il est en attente de validation par un administrateur."
            },
            status=status.HTTP_201_CREATED,
        )

    # Envoie l'email de vérification (non bloquant — le compte est déjà actif)
    _send_verification_link(user)

    tokens = AuthResponseSerializer.get_tokens_for_user(user)
    return Response(tokens, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def confirm_email(request):
    """
    GET /api/auth/confirm-email?uid=...&token=...
    Lien cliquable depuis l'email — active le compte et retourne une page HTML.
    """
    from django.http import HttpResponse
    from django.utils.encoding import force_str
    from django.utils.http import urlsafe_base64_decode

    from apps.auth.tokens import email_verification_token

    uid = request.query_params.get("uid")
    token = request.query_params.get("token")

    error_html = """<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Glycopilot</title>
    <style>body{{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}}
    .card{{background:white;padding:2rem 3rem;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1);text-align:center;max-width:400px}}
    h2{{color:{color}}}p{{color:#555}}</style></head>
    <body><div class="card"><h2>{title}</h2><p>{msg}</p></div></body></html>"""

    if not uid or not token:
        return HttpResponse(
            error_html.format(color="#e53e3e", title="Lien invalide", msg="Ce lien de vérification est incomplet."),
            content_type="text/html", status=400,
        )

    try:
        auth_id = force_str(urlsafe_base64_decode(uid))
        user = AuthAccount.objects.get(pk=auth_id)
    except (TypeError, ValueError, AuthAccount.DoesNotExist):
        return HttpResponse(
            error_html.format(color="#e53e3e", title="Lien invalide", msg="Ce lien de vérification n'est pas valide."),
            content_type="text/html", status=400,
        )

    if not email_verification_token.check_token(user, token):
        return HttpResponse(
            error_html.format(color="#e53e3e", title="Lien expiré", msg="Ce lien a expiré ou a déjà été utilisé. Demandez un nouvel email de vérification depuis l'application."),
            content_type="text/html", status=400,
        )

    if not user.is_active:
        user.is_active = True
        user.save(update_fields=["is_active"])

    success_html = """<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <title>Glycopilot — Compte activé</title>
    <style>body{{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}}
    .card{{background:white;padding:2rem 3rem;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.1);text-align:center;max-width:400px}}
    h2{{color:#38a169}}p{{color:#555}}.emoji{{font-size:3rem;margin-bottom:1rem}}</style></head>
    <body><div class="card"><div class="emoji">✅</div>
    <h2>Compte activé !</h2>
    <p>Votre adresse email a été confirmée.<br>Vous pouvez maintenant vous connecter à l'application Glycopilot.</p>
    </div></body></html>"""

    return HttpResponse(success_html, content_type="text/html", status=200)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def verify_email(request):
    """
    POST /api/auth/verify-email
    Body : { "uid": "...", "token": "..." }
    Active le compte et retourne les tokens JWT.
    """
    from django.utils.encoding import force_str
    from django.utils.http import urlsafe_base64_decode

    from apps.auth.tokens import email_verification_token

    uid = request.data.get("uid")
    token = request.data.get("token")

    if not uid or not token:
        return Response({"error": "uid et token sont requis."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        auth_id = force_str(urlsafe_base64_decode(uid))
        user = AuthAccount.objects.get(pk=auth_id)
    except (TypeError, ValueError, AuthAccount.DoesNotExist):
        return Response({"error": "Lien invalide."}, status=status.HTTP_400_BAD_REQUEST)

    if not email_verification_token.check_token(user, token):
        return Response({"error": "Lien expiré ou invalide."}, status=status.HTTP_400_BAD_REQUEST)

    user.is_active = True
    user.save(update_fields=["is_active"])

    tokens = AuthResponseSerializer.get_tokens_for_user(user)
    return Response(tokens, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
def resend_verification(request):
    """
    POST /api/auth/resend-verification
    Body : { "email": "..." }
    Renvoie l'email de vérification si le compte est inactif.
    Répond toujours 200 pour ne pas exposer l'existence du compte.
    """
    email = (request.data.get("email") or "").strip().lower()
    if not email:
        return Response({"error": "email requis."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = AuthAccount.objects.get(email=email, is_active=False)
        _send_verification_link(user)
    except AuthAccount.DoesNotExist:
        pass  # Réponse identique pour ne pas révéler l'existence du compte

    return Response(
        {"message": "Si ce compte existe et est inactif, un email vient d'être envoyé."},
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([AuthRateThrottle])
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

    return Response(format_serializer_errors(serializer.errors), status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@authentication_classes([])
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
        # Token already expired/blacklisted — logout goal is achieved
        return Response({"message": "Déconnexion réussie."}, status=status.HTTP_200_OK)


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
        return Response(format_serializer_errors(serializer.errors), status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    email = data["email"].lower()
    first_name = data["first_name"]
    last_name = data["last_name"]
    password = data["password"]
    account_type = data["account_type"]

    role_obj, _ = Role.objects.get_or_create(
        name=account_type, defaults={"name": account_type}
    )
    user_identity = User.objects.create(first_name=first_name, last_name=last_name)
    AuthAccount.objects.create_user(
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
