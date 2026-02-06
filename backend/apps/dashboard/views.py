from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.activities.models import UserActivity
from apps.alerts.models import AlertEvent, AlertSeverity
from apps.glycemia.models import Glycemia
from apps.meals.models import Meal, UserMeal
from apps.medications.models import UserMedication

from .models import UserWidget, UserWidgetLayout
from .serializers import (
    DashboardSummarySerializer,
    WidgetLayoutResponseSerializer,
    WidgetLayoutUpdateSerializer,
    WidgetListSerializer,
)
from .services import DashboardCache, HealthScoreService, WidgetCatalog


class DashboardSummaryView(APIView):
    """
    GET /api/v1/dashboard/summary
    Retourne les données agrégées du dashboard.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        include = request.query_params.getlist("include[]")

        cached = DashboardCache.get_summary(user.pk)
        if cached:
            return Response(cached)

        data = self._build_summary(user, include)

        DashboardCache.set_summary(user.pk, data)

        serializer = DashboardSummarySerializer(data)
        return Response(serializer.data)

    def _build_summary(self, user, include: list) -> dict:
        include_all = not include

        data = {
            "glucose": self._get_glucose_data(user),
            "alerts": self._get_alerts_data(user),
            "medication": self._get_medication_data(user),
            "nutrition": (
                self._get_nutrition_data(user)
                if include_all or "nutrition" in include
                else {
                    "calories": {"consumed": 0, "goal": 1800},
                    "carbs": {"grams": 0, "goal": 200},
                }
            ),
            "activity": (
                self._get_activity_data(user)
                if include_all or "activity" in include
                else {"steps": {"value": 0, "goal": 8000}, "activeMinutes": 0}
            ),
            "healthScore": HealthScoreService.calculate(user),
        }

        return data

    def _get_glucose_data(self, user) -> dict | None:
        latest = Glycemia.objects.filter(user=user).first()
        if not latest:
            return None

        return {
            "value": latest.value,
            "unit": latest.unit,
            "trend": latest.trend,
            "recordedAt": latest.measured_at,
        }

    def _get_alerts_data(self, user) -> list:
        alerts = AlertEvent.objects.filter(
            user=user, status__in=["TRIGGERED", "SENT"]
        ).order_by("-rule__severity", "-triggered_at")[:3]

        result = []
        for alert in alerts:
            severity_map = {
                AlertSeverity.CRITICAL: "critical",
                AlertSeverity.HIGH: "high",
                AlertSeverity.MEDIUM: "medium",
                AlertSeverity.LOW: "low",
                AlertSeverity.INFO: "info",
            }
            result.append(
                {
                    "alertId": str(alert.id),
                    "type": alert.rule.code.lower(),
                    "severity": severity_map.get(alert.rule.severity, "medium"),
                }
            )

        return result

    def _get_medication_data(self, user) -> dict:
        # Récupérer la prochaine dose
        next_dose = (
            UserMedication.objects.filter(user=user, statut=True, taken_at__isnull=True)
            .select_related("medication")
            .first()
        )

        # Calculer les médicaments pris aujourd'hui
        today = timezone.now().date()
        taken_today = UserMedication.objects.filter(
            user=user, statut=True, taken_at__date=today
        ).count()

        # Calculer le total de médicaments actifs pour aujourd'hui
        total_today = UserMedication.objects.filter(
            user=user, statut=True, start_date__lte=today
        ).count()

        result = {
            "taken_count": taken_today,
            "total_count": total_today,
            "nextDose": None,
        }

        if next_dose:
            result["nextDose"] = {
                "name": next_dose.medication.name,
                "scheduledAt": timezone.now(),
                "status": "pending",
            }

        return result

    def _get_nutrition_data(self, user) -> dict:
        since = timezone.now() - timedelta(hours=24)
        meals = UserMeal.objects.filter(user=user, taken_at__gte=since).select_related(
            "meal"
        )

        total_calories = 0
        total_carbs = 0

        for user_meal in meals:
            if user_meal.meal.calories:
                total_calories += user_meal.meal.calories
            if user_meal.meal.glucose:
                total_carbs += int(user_meal.meal.glucose)

        return {
            "calories": {"consumed": total_calories, "goal": 1800},
            "carbs": {"grams": total_carbs, "goal": 200},
        }

    def _get_activity_data(self, user) -> dict:
        today = timezone.now().date()
        activities = UserActivity.objects.filter(user=user, start__date=today)

        total_minutes = 0
        for activity in activities:
            duration = (activity.end - activity.start).total_seconds() / 60
            total_minutes += duration

        return {
            "steps": {"value": 0, "goal": 8000},
            "activeMinutes": int(total_minutes),
        }


class DashboardWidgetsView(APIView):
    """
    GET /api/v1/dashboard/widgets
    Retourne la liste des widgets de l'utilisateur.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        cached = DashboardCache.get_widgets(user.pk)
        if cached:
            return Response({"widgets": cached})

        user_widgets = UserWidget.objects.filter(user=user)

        if not user_widgets.exists():
            widgets = self._get_default_widgets()
        else:
            widgets = []
            for uw in user_widgets:
                widget_def = WidgetCatalog.get_widget(uw.widget_id)
                if widget_def:
                    widgets.append(
                        {
                            "widgetId": uw.widget_id,
                            "title": widget_def.title,
                            "lastUpdated": uw.last_refreshed_at,
                            "refreshInterval": uw.refresh_interval,
                            "visible": uw.visible,
                        }
                    )

        DashboardCache.set_widgets(user.pk, widgets)

        return Response({"widgets": widgets})

    def _get_default_widgets(self) -> list:
        widgets = []
        for widget_id in WidgetCatalog.get_default_widgets():
            widget_def = WidgetCatalog.get_widget(widget_id)
            if widget_def:
                widgets.append(
                    {
                        "widgetId": widget_def.widget_id,
                        "title": widget_def.title,
                        "lastUpdated": None,
                        "refreshInterval": widget_def.default_refresh_interval,
                        "visible": True,
                    }
                )
        return widgets


class DashboardWidgetLayoutView(APIView):
    """
    PATCH /api/v1/dashboard/widgets/layout
    Met à jour le layout des widgets.
    """

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        user = request.user

        serializer = WidgetLayoutUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        layout = serializer.validated_data["layout"]

        current_widget_ids = set()
        for item in layout:
            widget_id = item["widgetId"]
            current_widget_ids.add(widget_id)

            UserWidgetLayout.objects.update_or_create(
                user=user,
                widget_id=widget_id,
                defaults={
                    "column": item["column"],
                    "row": item["row"],
                    "size": item["size"],
                    "pinned": item["pinned"],
                },
            )

            widget_def = WidgetCatalog.get_widget(widget_id)
            UserWidget.objects.update_or_create(
                user=user,
                widget_id=widget_id,
                defaults={
                    "visible": True,
                    "refresh_interval": (
                        widget_def.default_refresh_interval if widget_def else 300
                    ),
                },
            )

        UserWidget.objects.filter(user=user).exclude(
            widget_id__in=current_widget_ids
        ).update(visible=False)

        DashboardCache.invalidate_all(user.pk)

        response_layout = []
        for item in layout:
            response_layout.append(
                {
                    "widgetId": item["widgetId"],
                    "column": item["column"],
                    "row": item["row"],
                    "size": item["size"],
                    "pinned": item["pinned"],
                }
            )

        return Response(
            {
                "layout": response_layout,
                "updatedAt": timezone.now(),
            }
        )
