# Routes centralisées pour l'API
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from controllers import api_controller

# Configuration du router DRF
router = DefaultRouter()

# Enregistrement des routes API
# router.register(r'users', api_controller.UserViewSet)
# router.register(r'products', api_controller.ProductViewSet)

# URLs principales
urlpatterns = [
    # API routes
    path('api/', include(router.urls)),
    
    # Routes spécifiques
    path('api/health/', api_controller.health_check, name='health_check'),
    
    # Admin (si nécessaire)
    # path('admin/', admin.site.urls),
]