# Helper functions
import uuid
from datetime import datetime
from typing import Any, Dict


def generate_uuid() -> str:
    """
    Génère un UUID unique
    """
    return str(uuid.uuid4())


def format_response(
    data: Any, message: str = "Success", status: int = 200
) -> Dict[str, Any]:
    """
    Formate une réponse API standardisée
    """
    return {
        "status": "success" if status < 400 else "error",
        "message": message,
        "data": data,
        "timestamp": datetime.now().isoformat(),
        "code": status,
    }


def validate_email(email: str) -> bool:
    """
    Valide un format d'email basique
    """
    import re

    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None
