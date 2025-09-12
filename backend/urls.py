from django.urls import path
from django.http import JsonResponse
from .standards import api_response, api_error

def api_view(request):
    """Endpoint principal de l'API"""
    return JsonResponse(api_response(
        data={"service": "Glycopilot API", "version": "1.0.0"},
        message="API is running successfully"
    ))

def health_view(request):
    """Endpoint de santé de l'API"""
    return JsonResponse(api_response(
        data={"status": "healthy", "database": "connected"},
        message="Service is healthy"
    ))

urlpatterns = [
    path('api/', api_view, name='api'),
    path('api/health/', health_view, name='health'),
]
