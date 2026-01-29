from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorAssociationsView, DoctorVerificationViewSet
from .views.care_team_views import CareTeamViewSet

router = DefaultRouter()
router.register(r"care-team", CareTeamViewSet, basename="care-team")
router.register(r"verification", DoctorVerificationViewSet, basename="doctor-verification")

urlpatterns = [
    path("medecins-patients/", DoctorAssociationsView.as_view(), name="doctor-associations"),
    path("", include(router.urls)),
]
