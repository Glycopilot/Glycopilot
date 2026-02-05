"""
Authentification JWT à deux clés (dual key).

POURQUOI DEUX CLÉS ?
--------------------
- Patient et docteur : leurs jetons sont signés avec SECRET_KEY (clé principale).
- Admin et superadmin : leurs jetons sont signés avec SECRET_KEY_ADMIN (clé séparée).
  → Admin/superadmin ont "leur propre" type de jeton, distinct du reste.

COMMENT ÇA MARCHE À LA VALIDATION ?
-----------------------------------
À chaque requête API (header Authorization: Bearer <token>), on doit vérifier le jeton.
Cette classe essaie dans l'ordre :
  1. Valider avec SECRET_KEY → accepte les jetons patient/docteur.
  2. Si échec et que SECRET_KEY_ADMIN est défini : valider avec SECRET_KEY_ADMIN
     → accepte les jetons admin/superadmin.
Si aucune clé ne valide le jeton → erreur "Le jeton est invalide ou expiré".

CRÉER UN COMPTE ADMIN / SUPERADMIN ?
------------------------------------
Deux possibilités (voir README ou AUTH_API pour les détails) :

  1. Depuis Docker (premier superadmin, ou admin Django) :
     docker compose exec backend python manage.py createsuperuser
     → Demande email + mot de passe. Crée un AuthAccount avec is_staff=True, is_superuser=True.
     → Pour que l'app le reconnaisse comme SUPERADMIN, ajouter un Profile avec rôle SUPERADMIN
        (via Django Admin ou shell : Profile.objects.create(user=..., role=Role.objects.get(name="SUPERADMIN"))).

  2. Par l’API (quand un superadmin existe déjà) :
     POST /api/auth/create-admin/
     Header: Authorization: Bearer <token_superadmin>
     Body: { "email", "first_name", "last_name", "password", "password_confirm", "account_type": "ADMIN" ou "SUPERADMIN" }
     → Seul un utilisateur déjà superadmin (is_superuser) peut appeler cet endpoint.
"""

from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings
import jwt


class _PayloadWrapper:
    """Wrapper minimal pour utiliser un payload décodé comme token validé (accès par [claim])."""
    def __init__(self, payload):
        self.payload = payload

    def __getitem__(self, key):
        return self.payload[key]

    def get(self, key, default=None):
        return self.payload.get(key, default)


class JWTAuthenticationDualKey(JWTAuthentication):
    """
    Valide les jetons signés soit avec SECRET_KEY (patient, docteur), soit avec SECRET_KEY_ADMIN (admin, superadmin).
    Tente d'abord SECRET_KEY, puis SECRET_KEY_ADMIN si la première validation échoue.
    """

    def get_validated_token(self, raw_token):
   
        for AuthToken in api_settings.AUTH_TOKEN_CLASSES:
            try:
                return AuthToken(raw_token)
            except InvalidToken:
                pass
            except Exception:
                pass

        #Si SECRET_KEY_ADMIN est défini, tenter validation avec cette clé (admin, superadmin)
        admin_key = getattr(settings, "SECRET_KEY_ADMIN", None)
        if admin_key:
            try:
                payload = jwt.decode(
                    raw_token.decode() if isinstance(raw_token, bytes) else raw_token,
                    admin_key,
                    algorithms=[getattr(api_settings, "ALGORITHM", "HS256")],
                )
                return _PayloadWrapper(payload)
            except Exception:
                pass

        #Aucune clé n'a validé le jeton
        raise InvalidToken(
            {"detail": "Le jeton est invalide ou expiré.", "code": "token_not_valid"}
        )
