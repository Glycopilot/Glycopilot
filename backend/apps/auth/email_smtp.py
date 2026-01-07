# apps/auth/email_smtp.py

from django.conf import settings
from django.core.mail import send_mail


def send_reset_password_email(user_email: str, reset_link: str):
    sujet = "Réinitialisation de votre mot de passe"
    message = f"""
    Bonjour,

    Vous avez demandé à réinitialiser votre mot de passe. 
    Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :

    {reset_link}

    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

    Merci !
    """
    expediteur = settings.DEFAULT_FROM_EMAIL
    destinataires = [user_email]

    try:
        send_mail(sujet, message, expediteur, destinataires, fail_silently=False)
        print(f"Email de réinitialisation envoyé à {user_email}")
    except Exception as e:
        print(f"Erreur lors de l'envoi de l'email : {e}")
