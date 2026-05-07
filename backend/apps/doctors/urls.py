from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import DoctorAssociationsView, DoctorVerificationViewSet
from .views.care_team_views import CareTeamViewSet
from .views.patient_medical_views import DoctorPatientMedicalView

router = DefaultRouter()
router.register(r"care-team", CareTeamViewSet, basename="care-team")
router.register(
    r"verification", DoctorVerificationViewSet, basename="doctor-verification"
)

urlpatterns = [
    path(
        "medecins-patients/",
        DoctorAssociationsView.as_view(),
        name="doctor-associations",
    ),
    path(
        "patients/<uuid:patient_id>/medical/",
        DoctorPatientMedicalView.as_view(),
        name="doctor-patient-medical",
    ),
    path("", include(router.urls)),
]
