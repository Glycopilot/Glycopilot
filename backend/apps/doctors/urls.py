from django.urls import path
from .views import DoctorAssociationsView

urlpatterns = [
    path("medecins-patients/", DoctorAssociationsView.as_view(), name="doctor-associations"),
]
