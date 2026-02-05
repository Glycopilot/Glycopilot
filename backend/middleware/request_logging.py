"""
Middleware de journalisation des requêtes HTTP.
Logge uniquement méthode, chemin et code de statut (aucune donnée personnelle).
"""

import logging

logger = logging.getLogger("middleware.request")


class RequestLoggingMiddleware:
    """Journalise chaque requête après traitement (sans PII)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        logger.info(
            "%s %s %s",
            request.method,
            request.path,
            response.status_code,
        )
        return response
