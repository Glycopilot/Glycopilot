"""
Normes API pour Glycopilot
Toutes les réponses API doivent respecter ces standards
"""

from datetime import datetime
from typing import Any, Dict, Optional

# Version de l'API
API_VERSION = ""
API_PREFIX = "/api"

# Champs obligatoires dans toutes les réponses
REQUIRED_RESPONSE_FIELDS = ["status", "message", "timestamp", "code"]

# Statuts autorisés
ALLOWED_STATUSES = ["success", "error"]

# Codes d'erreur standard
HTTP_CODES = {
    200: "OK",
    201: "Created", 
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    422: "Unprocessable Entity",
    500: "Internal Server Error"
}

# Méthodes HTTP autorisées
ALLOWED_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH"]

def api_response(
    data: Any = None,
    message: str = "Success",
    status: str = "success",
    code: int = 200
) -> Dict[str, Any]:
    """
    Format standard pour toutes les réponses API
    
    Args:
        data: Données à retourner
        message: Message descriptif
        status: "success" ou "error"
        code: Code HTTP
    
    Returns:
        Dict formaté selon la norme
    """
    if status not in ALLOWED_STATUSES:
        raise ValueError(f"Status must be one of {ALLOWED_STATUSES}")
    
    if code not in HTTP_CODES:
        raise ValueError(f"Code must be one of {list(HTTP_CODES.keys())}")
    
    return {
        "status": status,
        "message": message,
        "data": data,
        "timestamp": datetime.now().isoformat(),
        "code": code
    }

def api_error(
    message: str = "Error",
    code: int = 400,
    data: Any = None
) -> Dict[str, Any]:
    """
    Format standard pour les erreurs API
    
    Args:
        message: Message d'erreur
        code: Code HTTP d'erreur
        data: Données d'erreur supplémentaires
    
    Returns:
        Dict formaté pour les erreurs
    """
    return api_response(
        data=data,
        message=message,
        status="error",
        code=code
    )

def validate_endpoint_path(path: str) -> bool:
    """
    Valide qu'un endpoint respecte la norme /api/
    
    Args:
        path: Chemin de l'endpoint
    
    Returns:
        True si conforme, False sinon
    """
    return path.startswith(API_PREFIX)

def validate_response_format(response_data: Dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Valide qu'une réponse respecte le format standard
    
    Args:
        response_data: Données de la réponse
    
    Returns:
        (is_valid, errors_list)
    """
    errors = []
    
    # Vérifier les champs obligatoires
    for field in REQUIRED_RESPONSE_FIELDS:
        if field not in response_data:
            errors.append(f"Missing required field: {field}")
    
    # Vérifier le status
    if "status" in response_data:
        if response_data["status"] not in ALLOWED_STATUSES:
            errors.append(f"Invalid status: {response_data['status']}. Must be one of {ALLOWED_STATUSES}")
    
    # Vérifier le code
    if "code" in response_data:
        if not isinstance(response_data["code"], int):
            errors.append("Code must be an integer")
        elif response_data["code"] not in HTTP_CODES:
            errors.append(f"Invalid HTTP code: {response_data['code']}")
    
    return len(errors) == 0, errors
