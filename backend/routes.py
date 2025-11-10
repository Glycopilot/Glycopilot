# Routes centralisées pour l'API
from django.urls import include, path

from rest_framework.routers import DefaultRouter

from controllers import api_controller, auth_controller

# Configuration du router DRF
router = DefaultRouter()

# Enregistrement des routes API
# router.register(r'users', api_controller.UserViewSet)
# router.register(r'products', api_controller.ProductViewSet)

# URLs principales
urlpatterns = [
    # API routes
    path("api/", include(router.urls)),
    # Routes spécifiques
    path("api/health/", api_controller.health_check, name="health_check"),
    # Routes d'authentification
    path("api/auth/register", auth_controller.register, name="register"),
    path("api/auth/login", auth_controller.login, name="login"),
    path("api/auth/logout", auth_controller.logout, name="logout"),
    path("api/auth/refresh", auth_controller.refresh_token, name="refresh_token"),
    path("api/auth/me", auth_controller.me, name="me"),
    # Admin (si nécessaire)
    # path('admin/', admin.site.urls),
]
