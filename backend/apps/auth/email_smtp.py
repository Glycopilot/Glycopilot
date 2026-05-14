"""
Envoi des emails d'authentification (vérification email, réinitialisation mot de passe).
Aucune donnée personnelle n'est loggée.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_verification_email(user_email: str, verification_link: str) -> None:
    """
    Envoie l'email de vérification d'adresse email à l'inscription.
    En cas d'échec, log sans PII et sans propager.
    """
    subject = "Glycopilot — Confirmez votre adresse email"
    message = f"""Bonjour,

Merci de vous être inscrit sur Glycopilot.

Cliquez sur le lien ci-dessous pour activer votre compte :

{verification_link}

Ce lien est valable 48h. Si vous n'avez pas créé de compte, ignorez cet email.

Cordialement,
L'équipe Glycopilot."""
    from_email = settings.DEFAULT_FROM_EMAIL or "noreply@glycopilot.com"

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[user_email],
            fail_silently=False,
        )
        if settings.DEBUG:
            logger.debug("Verification email sent.")
    except Exception:
        logger.exception("Verification email delivery failed.")


def send_reset_password_email(user_email: str, reset_link: str) -> None:
    """
    Envoie l'email de réinitialisation de mot de passe.
    En cas d'échec, log sans PII et sans propager (l'API reste 200).
    """
    subject = "Réinitialisation de votre mot de passe"
    message = f"""Bonjour,

Vous avez demandé à réinitialiser votre mot de passe.
Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :

{reset_link}

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

Cordialement."""
    from_email = settings.DEFAULT_FROM_EMAIL or "noreply@glycopilot.com"
    recipient_list = [user_email]

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            fail_silently=False,
        )
        if settings.DEBUG:
            logger.debug("Password reset email sent.")
    except Exception:
        logger.exception("Password reset email delivery failed.")
