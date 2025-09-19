from datetime import datetime

from django.http import JsonResponse
from django.urls import path


def api_view(request):
    """Endpoint principal de l'API"""
    return JsonResponse(
        {
            "status": "success",
            "message": "API is running successfully",
            "data": {"service": "Glycopilot API", "version": "1.0.0"},
            "timestamp": datetime.now().isoformat(),
            "code": 200,
        }
    )


def health_view(request):
    """Endpoint de santé de l'API"""
    return JsonResponse(
        {
            "status": "success",
            "message": "Service is healthy",
            "data": {"status": "healthy", "database": "connected"},
            "timestamp": datetime.now().isoformat(),
            "code": 200,
        }
    )


urlpatterns = [
    path("api/", api_view, name="api"),
    path("api/health/", health_view, name="health"),
]
