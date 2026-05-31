"""
Authentification à deux facteurs par code email (opt-in).

- Le code à 6 chiffres est stocké haché sur AuthAccount avec une expiration.
- Le challenge de login est un jeton signé (TimestampSigner via django.core.signing)
  qui encode l'id du compte, pour lier l'étape de vérification à la tentative de login
  sans exposer d'identifiant interne.
"""

import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.core import signing
from django.utils import timezone

from apps.auth.email_smtp import send_2fa_code_email

OTP_TTL_MINUTES = 10
OTP_LENGTH = 6
_CHALLENGE_SALT = "glycopilot.2fa.challenge"


def generate_and_send_otp(account) -> None:
    """Génère un code, le stocke haché avec expiration, et l'envoie par email.

    Propage si l'envoi email échoue (le code est tout de même persisté, mais
    l'appelant doit signaler l'échec d'envoi).
    """
    code = f"{secrets.randbelow(10 ** OTP_LENGTH):0{OTP_LENGTH}d}"
    account.otp_code_hash = make_password(code)
    account.otp_expires_at = timezone.now() + timedelta(minutes=OTP_TTL_MINUTES)
    account.save(update_fields=["otp_code_hash", "otp_expires_at"])
    send_2fa_code_email(account.email, code)


def verify_otp(account, code: str) -> bool:
    """Vérifie le code (non expiré + correspondance) et le consomme si valide."""
    if not account.otp_code_hash or account.otp_expires_at is None:
        return False
    if timezone.now() > account.otp_expires_at:
        return False
    if not code or not check_password(str(code), account.otp_code_hash):
        return False
    # Usage unique : on consomme le code après succès.
    account.otp_code_hash = ""
    account.otp_expires_at = None
    account.save(update_fields=["otp_code_hash", "otp_expires_at"])
    return True


def make_challenge(account) -> str:
    """Jeton signé court qui identifie le compte pour l'étape de vérification login."""
    return signing.dumps(str(account.pk), salt=_CHALLENGE_SALT)


def read_challenge(token: str):
    """Renvoie l'AuthAccount lié au challenge, ou None si invalide/expiré."""
    try:
        pk = signing.loads(token, salt=_CHALLENGE_SALT, max_age=OTP_TTL_MINUTES * 60)
    except signing.BadSignature:
        return None

    from apps.users.models import AuthAccount

    return AuthAccount.objects.filter(pk=pk).first()
