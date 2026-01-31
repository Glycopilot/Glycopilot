from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import MedicationViewSet, UserMedicationViewSet

router = DefaultRouter()
router.register(r"reference", MedicationViewSet, basename="medications-reference")
router.register(r"log", UserMedicationViewSet, basename="medications-log")

urlpatterns = [
    path("", include(router.urls)),
]
