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
