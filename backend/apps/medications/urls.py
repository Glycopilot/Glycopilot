from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    MedicationIntakeViewSet,
    MedicationScheduleViewSet,
    MedicationViewSet,
    UserMedicationViewSet,
    trigger_medication_reminders,
)

router = DefaultRouter()
router.register(r"reference", MedicationViewSet, basename="medications-reference")
router.register(r"log", UserMedicationViewSet, basename="medications-log")
router.register(r"intakes", MedicationIntakeViewSet, basename="medications-intakes")
router.register(r"schedules", MedicationScheduleViewSet, basename="medication-schedules")

urlpatterns = [
    path("", include(router.urls)),
    path("reminders/trigger/", trigger_medication_reminders, name="medication-reminders-trigger"),
]
