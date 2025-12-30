"""
Middleware simple qui journalise les requêtes entrantes avec quelques
informations supplémentaires (utilisateur, rôle...).
"""

import logging

logger = logging.getLogger("middleware.request")


class RequestLoggingMiddleware:
    """
    Journalise chaque requête après traitement par la vue.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        user = getattr(request, "user", None)
        logger.info(
            "Request handled",
            extra={
                "path": request.path,
                "method": request.method,
                "status_code": response.status_code,
                "user_id": getattr(user, "id", None),
                "user_email": getattr(user, "email", None),
                "user_role": getattr(user, "role", None),
            },
        )
        return response
