from rest_framework import viewsets, permissions
from .models import Medication, UserMedication
from .serializers import MedicationSerializer, UserMedicationSerializer

class MedicationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly ViewSet for reference medications.
    """
    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated]

class UserMedicationViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for user's medications.
    Automatically filters by current user.
    """
    serializer_class = UserMedicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserMedication.objects.filter(user=self.request.user).order_by("-start_date")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
