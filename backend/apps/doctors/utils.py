"""
Envoi des invitations équipe de soins (médecin / patient).
Aucune donnée personnelle n'est loggée.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_care_team_invitation(to_email, inviter_name, role, is_existing_user=False):
    """
    Envoie l'email d'invitation à rejoindre l'équipe de soins.
    Destinataire : to_email (le médecin invité ou le patient invité).
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")

    if is_existing_user:
        subject = f"Glycopilot - Invitation de {inviter_name}"
        link = f"{frontend_url}/dashboard"
        message_body = (
            f"Bonjour,\n\n{inviter_name} vous a ajouté à son équipe de soins en tant que {role}.\n"
            f"Connectez-vous pour voir les détails : {link}"
        )
    else:
        subject = f"Glycopilot - Invitation à rejoindre l'équipe de {inviter_name}"
        link = f"{frontend_url}/register?email={to_email}&role={role}"
        message_body = (
            f"Bonjour,\n\n{inviter_name} vous invite à rejoindre son équipe de soins sur Glycopilot en tant que {role}.\n"
            f"Créez votre compte ici : {link}"
        )

    try:
        send_mail(
            subject=subject,
            message=message_body,
            from_email=settings.DEFAULT_FROM_EMAIL or "noreply@glycopilot.com",
            recipient_list=[to_email],
            fail_silently=False,
        )
        if settings.DEBUG:
            logger.debug("Care team invitation email sent.")
        return True
    except Exception:
        logger.exception("Care team invitation email failed.")
        return False


def send_doctor_verification_result_email(to_email, is_accepted, rejection_reason=None):
    """
    Envoie un email au docteur pour l'informer du résultat de la vérification.
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")

    if is_accepted:
        subject = "Glycopilot - Votre compte médecin a été validé"
        link = f"{frontend_url}/login"
        message_body = (
            "Bonjour Dr,\n\n"
            "Votre compte médecin sur Glycopilot a été validé par notre équipe.\n"
            f"Vous pouvez désormais vous connecter et inviter vos patients : {link}\n\n"
            "Bienvenue dans l'équipe Glycopilot !"
        )
    else:
        subject = "Glycopilot - Mise à jour sur votre inscription"
        message_body = (
            "Bonjour,\n\n"
            "Nous avons examiné votre demande d'inscription en tant que médecin sur Glycopilot.\n"
            "Malheureusement, nous ne pouvons pas valider votre compte pour le moment.\n\n"
            f"Motif : {rejection_reason or 'Non spécifié.'}\n\n"
            "Si vous pensez qu'il s'agit d'une erreur, merci de contacter le support."
        )

    try:
        send_mail(
            subject=subject,
            message=message_body,
            from_email=settings.DEFAULT_FROM_EMAIL or "noreply@glycopilot.com",
            recipient_list=[to_email],
            fail_silently=False,
        )
        if settings.DEBUG:
            logger.debug(f"Doctor verification email sent (accepted={is_accepted}).")
        return True
    except Exception:
        logger.exception("Doctor verification email failed.")
        return False
