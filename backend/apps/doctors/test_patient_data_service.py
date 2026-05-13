from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from django.test import TestCase

from apps.doctors.services.patient_data_service import DoctorPatientDataService


class DoctorPatientDataServiceTests(TestCase):
    @patch("apps.doctors.services.patient_data_service.HealthScoreService.calculate")
    @patch("apps.doctors.services.patient_data_service.DoctorPatientDataService._get_activity_data")
    @patch("apps.doctors.services.patient_data_service.DoctorPatientDataService._get_nutrition_data")
    @patch("apps.doctors.services.patient_data_service.DoctorPatientDataService._get_medication_data")
    @patch("apps.doctors.services.patient_data_service.DoctorPatientDataService._get_alerts_data")
    @patch("apps.doctors.services.patient_data_service.DoctorPatientDataService._get_glucose_data")
    def test_get_patient_dashboard_aggregates_all_sections(
        self,
        mock_glucose,
        mock_alerts,
        mock_med,
        mock_nutrition,
        mock_activity,
        mock_health,
    ):
        patient = object()
        mock_glucose.return_value = {"value": 110}
        mock_alerts.return_value = [{"alertId": "1"}]
        mock_med.return_value = {"nextDose": None}
        mock_nutrition.return_value = {"calories": {"consumed": 500, "goal": 1800}}
        mock_activity.return_value = {"activeMinutes": 30}
        mock_health.return_value = 77

        result = DoctorPatientDataService.get_patient_dashboard(patient)

        self.assertEqual(result["healthScore"], 77)
        self.assertEqual(result["glucose"]["value"], 110)
        self.assertEqual(result["alerts"][0]["alertId"], "1")

    @patch("apps.doctors.services.patient_data_service.Glycemia")
    def test_get_glucose_data_returns_none_when_empty(self, mock_glycemia):
        mock_glycemia.objects.filter.return_value.order_by.return_value.first.return_value = (
            None
        )

        result = DoctorPatientDataService._get_glucose_data(user=object())

        self.assertIsNone(result)

    @patch("apps.doctors.services.patient_data_service.Glycemia")
    def test_get_glucose_data_maps_latest_record(self, mock_glycemia):
        latest = MagicMock()
        latest.value = 123
        latest.unit = "mg/dL"
        latest.trend = "flat"
        latest.measured_at = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)
        mock_glycemia.objects.filter.return_value.order_by.return_value.first.return_value = (
            latest
        )

        result = DoctorPatientDataService._get_glucose_data(user=object())

        self.assertEqual(result["value"], 123)
        self.assertEqual(result["unit"], "mg/dL")
        self.assertEqual(result["trend"], "flat")

    @patch("apps.doctors.services.patient_data_service.UserMedication")
    def test_get_medication_data_returns_none_payload_when_no_next_dose(self, mock_med):
        mock_med.objects.filter.return_value.select_related.return_value.order_by.return_value.first.return_value = (
            None
        )

        result = DoctorPatientDataService._get_medication_data(user=object())

        self.assertEqual(result, {"nextDose": None})

    @patch("apps.doctors.services.patient_data_service.UserMedication")
    def test_get_medication_data_returns_pending_next_dose(self, mock_med):
        dose = MagicMock()
        dose.medication.name = "Metformin"
        dose.medication.dosage = "500mg"
        mock_med.objects.filter.return_value.select_related.return_value.order_by.return_value.first.return_value = (
            dose
        )

        result = DoctorPatientDataService._get_medication_data(user=object())

        self.assertEqual(result["nextDose"]["name"], "Metformin")
        self.assertEqual(result["nextDose"]["status"], "pending")

    @patch("apps.doctors.services.patient_data_service.UserMeal")
    def test_get_nutrition_data_sums_calories_and_carbs(self, mock_user_meal):
        m1 = MagicMock()
        m1.meal.calories = 450
        m1.meal.glucose = 55
        m2 = MagicMock()
        m2.meal.calories = 350
        m2.meal.glucose = 40
        mock_user_meal.objects.filter.return_value.select_related.return_value = [m1, m2]

        result = DoctorPatientDataService._get_nutrition_data(user=object())

        self.assertEqual(result["calories"]["consumed"], 800)
        self.assertEqual(result["carbs"]["grams"], 95)

    @patch("apps.doctors.services.patient_data_service.UserActivity")
    def test_get_activity_data_returns_active_minutes(self, mock_activity):
        start = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)
        act1 = MagicMock()
        act1.start = start
        act1.end = start + timedelta(minutes=20)
        act2 = MagicMock()
        act2.start = start
        act2.end = start + timedelta(minutes=25)
        mock_activity.objects.filter.return_value = [act1, act2]

        result = DoctorPatientDataService._get_activity_data(user=object())

        self.assertEqual(result["activeMinutes"], 45)
        self.assertEqual(result["steps"]["goal"], 8000)
