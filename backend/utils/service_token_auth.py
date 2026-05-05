"""
Authentification par token de service pour l'AI service.

L'AI service envoie : Authorization: ServiceToken <token>
Django valide contre AI_SERVICE_TOKEN dans les settings.
Retourne le premier compte admin/superadmin comme utilisateur de service.
"""
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ServiceTokenAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("ServiceToken "):
            return None

        token = auth_header.split(" ", 1)[1].strip()
        expected = getattr(settings, "AI_SERVICE_TOKEN", "")

        if not expected:
            return None

        if token != expected:
            raise AuthenticationFailed("Token de service invalide.")

        # Retourne le premier compte superadmin/admin comme utilisateur de service
        from django.contrib.auth import get_user_model
        AuthAccount = get_user_model()

        service_user = (
            AuthAccount.objects.filter(is_superuser=True).first()
            or AuthAccount.objects.filter(is_staff=True).first()
        )
        if not service_user:
            raise AuthenticationFailed("Aucun compte admin disponible pour le service.")

        return (service_user, "service_token")

    def authenticate_header(self, request):
        return "ServiceToken"
