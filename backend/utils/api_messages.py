"""Messages API lisibles pour le client (évite le jargon Django/ORM)."""

import re

EMAIL_ALREADY_USED = (
    "Cette adresse email est déjà associée à un compte. "
    "Connectez-vous ou utilisez une autre adresse."
)

_DEFAULT = "Une erreur est survenue. Veuillez réessayer."

_REPLACEMENTS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(
            r"auth\s*account|authaccount|objet\s+auth|ce\s+champ\s+email\s+existe",
            re.I,
        ),
        EMAIL_ALREADY_USED,
    ),
    (re.compile(r"already\s+exists|unique\s+constraint|duplicate\s+key", re.I), EMAIL_ALREADY_USED),
    (re.compile(r"invalid\s+credentials|unable\s+to\s+log\s+in", re.I), "Email ou mot de passe incorrect."),
    (re.compile(r"not\s+found|does\s+not\s+exist", re.I), "Aucun compte trouvé avec ces informations."),
]


def humanize_api_message(message: str | None, *, default: str = _DEFAULT) -> str:
    """Transforme un message technique en formulation adaptée à l'utilisateur."""
    if not message or not str(message).strip():
        return default
    text = str(message).strip()
    if text.startswith("{") or text.startswith("["):
        return default
    for pattern, replacement in _REPLACEMENTS:
        if pattern.search(text):
            return replacement
    return text
