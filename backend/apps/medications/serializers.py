from rest_framework import serializers

from .models import Medication, UserMedication


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = "__all__"


class UserMedicationSerializer(serializers.ModelSerializer):
    medication = MedicationSerializer(read_only=True)
    medication_id = serializers.PrimaryKeyRelatedField(
        queryset=Medication.objects.all(), source="medication", write_only=True
    )

    class Meta:
        model = UserMedication
        fields = [
            "id",
            "user",
            "medication",
            "medication_id",
            "start_date",
            "taken_at",
            "statut",
        ]
        read_only_fields = ["user"]
