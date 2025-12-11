"""URL configuration for glycemia app."""
from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import GlycemiaViewSet

router = DefaultRouter()
router.register(r"glucose", GlycemiaViewSet, basename="glucose")

urlpatterns = [
    path("", include(router.urls)),
]
