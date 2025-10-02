# Custom CORS Middleware
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

class CustomCorsMiddleware(MiddlewareMixin):
    """
    Middleware personnalisé pour gérer les CORS
    """
    
    def process_response(self, request, response):
        """Ajoute les headers CORS à la réponse"""
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response['Access-Control-Max-Age'] = '86400'
        
        return response
    
    def process_request(self, request):
        """Gère les requêtes OPTIONS (preflight)"""
        if request.method == 'OPTIONS':
            return JsonResponse({}, status=200)
        
        return None
