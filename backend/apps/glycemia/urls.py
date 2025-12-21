from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GlycemiaViewSet

router = DefaultRouter()
router.register(r'', GlycemiaViewSet, basename='glycemia')

urlpatterns = [
    path('', include(router.urls)),
]
