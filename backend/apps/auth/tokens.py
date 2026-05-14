from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """
    Token dédié à la vérification d'email à l'inscription.
    Salt distinct de PasswordResetTokenGenerator pour éviter toute réutilisation croisée.
    Le token est invalidé dès que is_active passe à True (hash inclut is_active).
    """

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.is_active}{user.email}{timestamp}"


email_verification_token = EmailVerificationTokenGenerator()
