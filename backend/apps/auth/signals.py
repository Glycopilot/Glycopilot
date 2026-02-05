from django.conf import settings
from django.dispatch import receiver

from django_rest_passwordreset.signals import reset_password_token_created

from apps.auth.email_smtp import send_reset_password_email


@receiver(reset_password_token_created)
def password_reset_token_created(
    sender, instance, reset_password_token, *args, **kwargs
):
    """
    Signal déclenché automatiquement lorsque quelqu'un demande une réinitialisation de mot de passe.
    Envoie un email avec un lien contenant le token.
    """
    user_email = reset_password_token.user.email
    token = reset_password_token.key

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    # Envoi de l'email
    send_reset_password_email(user_email, reset_link)
