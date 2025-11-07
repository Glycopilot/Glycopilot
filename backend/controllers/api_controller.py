# API Controller - Gestion des endpoints API
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health_check(request):
    """
    Endpoint de vérification de santé de l'API
    """
    return Response(
        {"status": "healthy", "message": "API is running", "version": "1.0.0"},
        status=status.HTTP_200_OK,
    )
