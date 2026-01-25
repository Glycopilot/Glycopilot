from django.conf import settings
from django.core.mail import send_mail

def send_care_team_invitation(to_email, inviter_name, role, is_existing_user=False):
    """
    Send an email invitation to join a care team.
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    
    if is_existing_user:
        # User exists, just notify them to check their dashboard
        subject = f"Glycopilot - Invitation de {inviter_name}"
        link = f"{frontend_url}/dashboard"
        message_body = f"Bonjour,\n\n{inviter_name} vous a ajouté à son équipe de soins en tant que {role}.\nConnectez-vous pour voir les détails : {link}"
    else:
        # User does not exist, invite to register
        subject = f"Glycopilot - Invitation à rejoindre l'équipe de {inviter_name}"
        link = f"{frontend_url}/register?email={to_email}&role={role}"
        message_body = f"Bonjour,\n\n{inviter_name} vous invite à rejoindre son équipe de soins sur Glycopilot en tant que {role}.\nCréez votre compte ici : {link}"

    try:
        send_mail(
            subject=subject,
            message=message_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[to_email],
            fail_silently=False 
        )
        print(f"Invitation email sent to {to_email}")
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
