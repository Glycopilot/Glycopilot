from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.activities.models import Activity, UserActivity
from apps.alerts.models import AlertEvent, AlertRule, AlertSeverity
from apps.dashboard.models import UserWidget, UserWidgetLayout
from apps.dashboard.serializers import WidgetLayoutUpdateSerializer
from apps.dashboard.services import HealthScoreService, WidgetCatalog
from apps.dashboard.views import DashboardSummaryView, DashboardWidgetsView
from apps.glycemia.models import Glycemia
from apps.meals.models import Meal, UserMeal
from apps.medications.models import Medication, UserMedication
from apps.users.models import AuthAccount


class DashboardCoverageTests(TestCase):
    def setUp(self):
        self.user = AuthAccount.objects.create_user(
            email="dash@test.com", password="pass123"
        )
        self.factory = APIRequestFactory()

    def test_dashboard_summary_paths(self):
        view = DashboardSummaryView.as_view()
        request = self.factory.get("/api/v1/dashboard/summary")
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, 200)

        Glycemia.objects.create(
            user=self.user, measured_at=timezone.now(), value=120, unit="mg/dL"
        )
        rule = AlertRule.objects.create(
            code="HYPO",
            name="Hypo",
            min_glycemia=70,
            severity=AlertSeverity.CRITICAL,
            is_active=True,
        )
        AlertEvent.objects.create(
            user=self.user, rule=rule, glycemia_value=60, status="TRIGGERED"
        )
        Medication.objects.create(medication_id=1, name="Metformin")
        UserMedication.objects.create(
            user=self.user,
            medication_id=1,
            start_date=timezone.now().date(),
            statut=True,
        )
        meal = Meal.objects.create(meal_id=1, name="Meal", calories=200, glucose=20)
        UserMeal.objects.create(
            user=self.user, meal=meal, taken_at=timezone.now() - timedelta(hours=1)
        )
        activity = Activity.objects.create(name="Walk")
        UserActivity.objects.create(
            user=self.user,
            activity=activity,
            start=timezone.now() - timedelta(minutes=30),
            end=timezone.now(),
        )

        request = self.factory.get(
            "/api/v1/dashboard/summary?include[]=nutrition&include[]=activity"
        )
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, 200)

    def test_dashboard_widgets_defaults(self):
        view = DashboardWidgetsView.as_view()
        request = self.factory.get("/api/v1/dashboard/widgets")
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("widgets", response.data)

        UserWidget.objects.create(user=self.user, widget_id="glucose_live")
        request = self.factory.get("/api/v1/dashboard/widgets")
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, 200)

    def test_widget_catalog_and_layout_serializer(self):
        all_widgets = WidgetCatalog.get_all_widgets()
        self.assertTrue(all_widgets)
        self.assertFalse(WidgetCatalog.is_valid_size("missing", "compact"))

        layout = [
            {
                "widgetId": "glucose_live",
                "column": 0,
                "row": 0,
                "size": "normal",
                "pinned": True,
            },
            {
                "widgetId": "glucose_live",
                "column": 1,
                "row": 0,
                "size": "normal",
                "pinned": False,
            },
        ]
        serializer = WidgetLayoutUpdateSerializer(data={"layout": layout})
        self.assertFalse(serializer.is_valid())

    def test_dashboard_models_str(self):
        widget = UserWidget.objects.create(user=self.user, widget_id="glucose_live")
        layout = UserWidgetLayout.objects.create(
            user=self.user, widget_id="glucose_live", column=0, row=1
        )
        self.assertIn("glucose_live", str(widget))
        self.assertIn("glucose_live", str(layout))

    def test_summary_helpers(self):
        view = DashboardSummaryView()
        Glycemia.objects.create(
            user=self.user, measured_at=timezone.now(), value=140, unit="mg/dL"
        )
        self.assertIsNotNone(view._get_glucose_data(self.user))

        rule = AlertRule.objects.create(
            code="HYPER",
            name="Hyper",
            max_glycemia=200,
            severity=AlertSeverity.HIGH,
            is_active=True,
        )
        AlertEvent.objects.create(
            user=self.user, rule=rule, glycemia_value=250, status="TRIGGERED"
        )
        alerts = view._get_alerts_data(self.user)
        self.assertTrue(alerts)

        med = Medication.objects.create(medication_id=3, name="Med3")
        UserMedication.objects.create(
            user=self.user,
            medication=med,
            start_date=timezone.now().date(),
            statut=True,
        )
        data = view._get_medication_data(self.user)
        self.assertIn("nextDose", data)

        meal = Meal.objects.create(meal_id=3, name="Meal3", calories=100, glucose=15)
        UserMeal.objects.create(
            user=self.user, meal=meal, taken_at=timezone.now()
        )
        nutrition = view._get_nutrition_data(self.user)
        self.assertGreaterEqual(nutrition["calories"]["consumed"], 100)

        activity = Activity.objects.create(name="Run")
        UserActivity.objects.create(
            user=self.user,
            activity=activity,
            start=timezone.now() - timedelta(minutes=20),
            end=timezone.now(),
        )
        activity_data = view._get_activity_data(self.user)
        self.assertGreater(activity_data["activeMinutes"], 0)

    def test_health_score_service_branches(self):
        Medication.objects.create(medication_id=2, name="Med2")
        with self.subTest("medication total zero"):
            class DummyQS:
                def exists(self):
                    return True

                def filter(self, **kwargs):
                    return self

                def count(self):
                    return 0

            from unittest.mock import patch

            with patch(
                "apps.medications.models.UserMedication.objects.filter",
                return_value=DummyQS(),
            ):
                score = HealthScoreService._calculate_adherence_score(self.user)
                self.assertEqual(score, 100.0)

        with self.subTest("nutrition ratio > 1"):
            meal = Meal.objects.create(meal_id=2, name="Meal2")
            for _ in range(30):
                UserMeal.objects.create(
                    user=self.user, meal=meal, taken_at=timezone.now()
                )
            score = HealthScoreService._calculate_nutrition_score(self.user)
            self.assertLessEqual(score, 100)
