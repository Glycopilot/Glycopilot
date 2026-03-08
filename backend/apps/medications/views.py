import datetime
import logging

from django.utils import timezone
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    IntakeStatus,
    Medication,
    MedicationIntake,
    MedicationSchedule,
    UserMedication,
)
from .serializers import (
    IntakeActionSerializer,
    MedicationIntakeSerializer,
    MedicationScheduleSerializer,
    MedicationSerializer,
    TodayIntakeSerializer,
    UserMedicationCreateSerializer,
    UserMedicationSerializer,
)

logger = logging.getLogger(__name__)


class MedicationViewSet(viewsets.ReadOnlyModelViewSet):
    """ReadOnly ViewSet for reference medications."""

    queryset = Medication.objects.all()
    serializer_class = MedicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Medication.objects.all()
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(name__icontains=q)
        return qs.order_by("name")


class UserMedicationViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for user's medications.
    Automatically filters by current user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ("create",):
            return UserMedicationCreateSerializer
        return UserMedicationSerializer

    def get_queryset(self):
        return (
            UserMedication.objects.filter(user=self.request.user)
            .select_related("medication")
            .prefetch_related("schedules")
            .order_by("-start_date")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"], url_path="today")
    def today(self, request):
        """
        Returns today's scheduled doses with their intake status.
        Creates pending MedicationIntake records on demand if missing.
        """
        today = timezone.localdate()
        active_meds = self.get_queryset().filter(
            statut=True,
            start_date__lte=today,
        ).filter(
            models_end_date_filter(today)
        )

        intakes = []
        for user_med in active_meds:
            for schedule in user_med.schedules.all():
                intake, _ = MedicationIntake.objects.get_or_create(
                    user_medication=user_med,
                    scheduled_date=today,
                    scheduled_time=schedule.time,
                    defaults={
                        "schedule": schedule,
                        "status": IntakeStatus.PENDING,
                    },
                )
                intakes.append(intake)

        serializer = TodayIntakeSerializer(intakes, many=True)
        return Response(serializer.data)


def models_end_date_filter(today):
    """Returns a Q object to filter medications active today."""
    from django.db.models import Q

    return Q(end_date__isnull=True) | Q(end_date__gte=today)


class MedicationScheduleViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for medication schedules (dose times).
    Filter by medication: GET /api/medications/schedules/?medication_id=1
    """

    serializer_class = MedicationScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = MedicationSchedule.objects.filter(
            user_medication__user=self.request.user
        ).select_related("user_medication")
        med_id = self.request.query_params.get("medication_id")
        if med_id:
            qs = qs.filter(user_medication_id=med_id)
        return qs

    def perform_create(self, serializer):
        medication_id = self.request.data.get("medication_id") or self.request.data.get("user_medication")
        user_med = UserMedication.objects.get(
            pk=medication_id, user=self.request.user
        )
        serializer.save(user_medication=user_med)


class MedicationIntakeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for medication intakes.
    Supports marking doses as taken, missed, or snoozed.
    """

    serializer_class = MedicationIntakeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = MedicationIntake.objects.filter(
            user_medication__user=self.request.user
        ).select_related("user_medication__medication", "schedule")

        date_str = self.request.query_params.get("date")
        if date_str:
            try:
                date = datetime.date.fromisoformat(date_str)
                qs = qs.filter(scheduled_date=date)
            except ValueError:
                pass

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs.order_by("scheduled_date", "scheduled_time")

    @action(detail=True, methods=["post"], url_path="action")
    def intake_action(self, request, pk=None):
        """
        Mark an intake as taken, missed, or snoozed.
        POST /api/medications/intakes/{id}/action/
        Body: { "action": "taken" | "missed" | "snoozed", "snoozed_until": "...", "taken_at": "..." }
        """
        intake = self.get_object()
        serializer = IntakeActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_value = serializer.validated_data["action"]
        now = timezone.now()

        if action_value == IntakeStatus.TAKEN:
            intake.status = IntakeStatus.TAKEN
            intake.taken_at = serializer.validated_data.get("taken_at") or now
            intake.snoozed_until = None
        elif action_value == IntakeStatus.MISSED:
            intake.status = IntakeStatus.MISSED
            intake.taken_at = None
            intake.snoozed_until = None
        elif action_value == IntakeStatus.SNOOZED:
            intake.status = IntakeStatus.SNOOZED
            intake.snoozed_until = serializer.validated_data["snoozed_until"]

        intake.save()
        return Response(MedicationIntakeSerializer(intake).data)

    @action(detail=False, methods=["get"], url_path="history")
    def history(self, request):
        """
        Returns intake history grouped by medication.
        GET /api/medications/intakes/history/?medication_id=1
        """
        qs = self.get_queryset().exclude(status=IntakeStatus.PENDING)
        med_id = request.query_params.get("medication_id")
        if med_id:
            qs = qs.filter(user_medication_id=med_id)
        serializer = MedicationIntakeSerializer(qs[:100], many=True)
        return Response(serializer.data)
