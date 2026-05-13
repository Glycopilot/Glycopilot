from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.dashboard.views import DashboardSummaryView

User = get_user_model()


class DashboardSummaryViewUnitTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="dash-unit@test.com", password="pass123")
        self.view = DashboardSummaryView()

    @patch("apps.dashboard.views.HealthScoreService.calculate", return_value=81)
    @patch.object(DashboardSummaryView, "_get_activity_data", return_value={"steps": {"value": 123, "goal": 8000}, "activeMinutes": 42})
    @patch.object(DashboardSummaryView, "_get_nutrition_data", return_value={"calories": {"consumed": 700, "goal": 1800}, "carbs": {"grams": 90, "goal": 200}})
    @patch.object(DashboardSummaryView, "_get_medication_data", return_value={"taken_count": 1, "total_count": 2, "nextDose": None})
    @patch.object(DashboardSummaryView, "_get_alerts_data", return_value=[])
    @patch.object(DashboardSummaryView, "_get_glucose_data", return_value={"value": 110, "unit": "mg/dL", "trend": "flat", "recordedAt": None})
    def test_build_summary_with_include_filter_disables_unrequested_sections(
        self,
        _mock_glucose,
        _mock_alerts,
        _mock_medication,
        _mock_nutrition,
        _mock_activity,
        _mock_health,
    ):
        data = self.view._build_summary(self.user, include=["nutrition"])

        self.assertEqual(data["nutrition"]["calories"]["consumed"], 700)
        self.assertEqual(data["activity"]["activeMinutes"], 0)
        self.assertEqual(data["activity"]["steps"]["value"], 0)
        self.assertEqual(data["healthScore"], 81)

    @patch("apps.dashboard.views.HealthScoreService.calculate", return_value=73)
    @patch.object(DashboardSummaryView, "_get_activity_data", return_value={"steps": {"value": 500, "goal": 8000}, "activeMinutes": 15})
    @patch.object(DashboardSummaryView, "_get_nutrition_data", return_value={"calories": {"consumed": 450, "goal": 1800}, "carbs": {"grams": 60, "goal": 200}})
    @patch.object(DashboardSummaryView, "_get_medication_data", return_value={"taken_count": 2, "total_count": 3, "nextDose": None})
    @patch.object(DashboardSummaryView, "_get_alerts_data", return_value=[{"alertId": "1", "type": "hypo", "severity": "high"}])
    @patch.object(DashboardSummaryView, "_get_glucose_data", return_value={"value": 95, "unit": "mg/dL", "trend": "down", "recordedAt": None})
    def test_build_summary_without_include_returns_all_sections(
        self,
        _mock_glucose,
        _mock_alerts,
        _mock_medication,
        _mock_nutrition,
        _mock_activity,
        _mock_health,
    ):
        data = self.view._build_summary(self.user, include=[])

        self.assertEqual(data["nutrition"]["carbs"]["grams"], 60)
        self.assertEqual(data["activity"]["activeMinutes"], 15)
        self.assertEqual(data["healthScore"], 73)
