from rest_framework import serializers

from .models import (
    IntakeStatus,
    Medication,
    MedicationIntake,
    MedicationSchedule,
    UserMedication,
)


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = [
            "medication_id",
            "name",
            "type",
            "dosage",
            "form",
            "route",
            "cis_code",
            "interval_h",
            "max_duration_d",
        ]


class MedicationScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationSchedule
        fields = ["id", "user_medication", "time", "reminder_enabled"]
        read_only_fields = ["user_medication"]


class MedicationIntakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedicationIntake
        fields = [
            "id",
            "user_medication",
            "schedule",
            "scheduled_date",
            "scheduled_time",
            "status",
            "taken_at",
            "snoozed_until",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class UserMedicationSerializer(serializers.ModelSerializer):
    medication = MedicationSerializer(read_only=True)
    medication_id = serializers.PrimaryKeyRelatedField(
        queryset=Medication.objects.all(),
        source="medication",
        write_only=True,
        required=False,
        allow_null=True,
    )
    schedules = MedicationScheduleSerializer(many=True, read_only=True)
    display_name = serializers.CharField(read_only=True)
    display_dosage = serializers.CharField(read_only=True)

    class Meta:
        model = UserMedication
        fields = [
            "id",
            "user",
            "medication",
            "medication_id",
            "custom_name",
            "custom_dosage",
            "display_name",
            "display_dosage",
            "start_date",
            "end_date",
            "doses_per_day",
            "meal_timing",
            "source",
            "statut",
            "schedules",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["user", "created_at", "updated_at"]

    def validate(self, data):
        medication = data.get("medication")
        custom_name = data.get("custom_name")
        if not medication and not custom_name:
            raise serializers.ValidationError(
                "Un médicament de référence ou un nom personnalisé est requis."
            )
        return data


class UserMedicationCreateSerializer(UserMedicationSerializer):
    """Serializer that also accepts schedule times on creation."""

    schedule_times = serializers.ListField(
        child=serializers.TimeField(),
        write_only=True,
        required=False,
        help_text="Liste des heures de prise (ex: ['08:00', '20:00'])",
    )
    reminder_enabled = serializers.BooleanField(
        write_only=True,
        required=False,
        default=True,
    )

    class Meta(UserMedicationSerializer.Meta):
        fields = UserMedicationSerializer.Meta.fields + [
            "schedule_times",
            "reminder_enabled",
        ]

    def create(self, validated_data):
        schedule_times = validated_data.pop("schedule_times", [])
        reminder_enabled = validated_data.pop("reminder_enabled", True)
        user_med = super().create(validated_data)
        for t in schedule_times:
            MedicationSchedule.objects.create(
                user_medication=user_med,
                time=t,
                reminder_enabled=reminder_enabled,
            )
        return user_med


class TodayIntakeSerializer(serializers.ModelSerializer):
    """Read-only serializer for today's scheduled doses."""

    medication_name = serializers.CharField(
        source="user_medication.display_name", read_only=True
    )
    medication_dosage = serializers.CharField(
        source="user_medication.display_dosage", read_only=True
    )
    meal_timing = serializers.CharField(
        source="user_medication.meal_timing", read_only=True
    )
    reminder_enabled = serializers.SerializerMethodField()

    class Meta:
        model = MedicationIntake
        fields = [
            "id",
            "user_medication",
            "scheduled_date",
            "scheduled_time",
            "status",
            "taken_at",
            "snoozed_until",
            "medication_name",
            "medication_dosage",
            "meal_timing",
            "reminder_enabled",
        ]

    def get_reminder_enabled(self, obj):
        if obj.schedule:
            return obj.schedule.reminder_enabled
        return False


class IntakeActionSerializer(serializers.Serializer):
    """Serializer for marking an intake as taken, missed, or snoozed."""

    action = serializers.ChoiceField(
        choices=[
            IntakeStatus.TAKEN,
            IntakeStatus.MISSED,
            IntakeStatus.SNOOZED,
        ]
    )
    snoozed_until = serializers.DateTimeField(required=False, allow_null=True)
    taken_at = serializers.DateTimeField(required=False, allow_null=True)

    def validate(self, data):
        if data["action"] == IntakeStatus.SNOOZED and not data.get("snoozed_until"):
            raise serializers.ValidationError(
                {"snoozed_until": "Requis pour l'action 'snoozed'."}
            )
        return data
