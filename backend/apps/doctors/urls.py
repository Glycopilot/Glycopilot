from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DoctorAssociationsView
from .views.care_team_views import CareTeamViewSet

router = DefaultRouter()
router.register(r"care-team", CareTeamViewSet, basename="care-team")

urlpatterns = [
    path("medecins-patients/", DoctorAssociationsView.as_view(), name="doctor-associations"),
    path("", include(router.urls)),
]
