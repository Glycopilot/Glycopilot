from datetime import timedelta
from unittest import TestCase
from unittest.mock import MagicMock, patch

from apps.dashboard.services.health_score_service import HealthScoreService


class HealthScoreServiceTests(TestCase):
    def test_calculate_uses_weighted_rounding(self):
        user = object()
        with (
            patch.object(
                HealthScoreService, "_calculate_glycemia_score", return_value=80
            ) as gly_mock,
            patch.object(
                HealthScoreService, "_calculate_adherence_score", return_value=70
            ) as adh_mock,
            patch.object(
                HealthScoreService, "_calculate_nutrition_score", return_value=60
            ) as nut_mock,
            patch.object(
                HealthScoreService, "_calculate_activity_score", return_value=50
            ) as act_mock,
        ):
            result = HealthScoreService.calculate(user)

        self.assertEqual(result, 68)
        gly_mock.assert_called_once_with(user)
        adh_mock.assert_called_once_with(user)
        nut_mock.assert_called_once_with(user)
        act_mock.assert_called_once_with(user)

    @patch("apps.glycemia.models.Glycemia")
    def test_calculate_glycemia_score_returns_default_when_no_readings(self, mock_glycemia):
        queryset = MagicMock()
        queryset.exists.return_value = False
        mock_glycemia.objects.filter.return_value = queryset

        result = HealthScoreService._calculate_glycemia_score(user=object())

        self.assertEqual(result, 50.0)

    @patch("apps.glycemia.models.Glycemia")
    def test_calculate_glycemia_score_computes_time_in_range(self, mock_glycemia):
        queryset = MagicMock()
        queryset.exists.return_value = True
        queryset.count.return_value = 10
        in_range_qs = MagicMock()
        in_range_qs.count.return_value = 7
        queryset.filter.return_value = in_range_qs
        mock_glycemia.objects.filter.return_value = queryset

        result = HealthScoreService._calculate_glycemia_score(user=object())

        self.assertEqual(result, 70.0)

    @patch("apps.medications.models.UserMedication")
    def test_calculate_adherence_score_returns_100_when_no_medications(self, mock_med):
        queryset = MagicMock()
        queryset.exists.return_value = False
        mock_med.objects.filter.return_value = queryset

        result = HealthScoreService._calculate_adherence_score(user=object())

        self.assertEqual(result, 100.0)

    @patch("apps.medications.models.UserMedication")
    def test_calculate_adherence_score_scales_taken_over_expected(self, mock_med):
        queryset = MagicMock()
        queryset.exists.return_value = True
        queryset.count.return_value = 2
        taken_qs = MagicMock()
        taken_qs.count.return_value = 7
        queryset.filter.return_value = taken_qs
        mock_med.objects.filter.return_value = queryset

        result = HealthScoreService._calculate_adherence_score(user=object())

        self.assertEqual(result, 50.0)

    @patch("apps.meals.models.UserMeal")
    def test_calculate_nutrition_score_returns_default_when_empty(self, mock_meal):
        queryset = MagicMock()
        queryset.exists.return_value = False
        mock_meal.objects.filter.return_value = queryset

        result = HealthScoreService._calculate_nutrition_score(user=object())

        self.assertEqual(result, 50.0)

    @patch("apps.meals.models.UserMeal")
    def test_calculate_nutrition_score_penalizes_over_ideal_ratio(self, mock_meal):
        queryset = MagicMock()
        queryset.exists.return_value = True
        queryset.count.return_value = 28  # 4 meals/day -> penalized to 83.33
        mock_meal.objects.filter.return_value = queryset

        result = HealthScoreService._calculate_nutrition_score(user=object())

        self.assertAlmostEqual(result, 83.3333333333, places=3)

    @patch("apps.activities.models.UserActivity")
    def test_calculate_activity_score_returns_default_when_empty(self, mock_activity):
        queryset = MagicMock()
        queryset.exists.return_value = False
        mock_activity.objects.filter.return_value = queryset

        result = HealthScoreService._calculate_activity_score(user=object())

        self.assertEqual(result, 30.0)

    @patch("apps.activities.models.UserActivity")
    def test_calculate_activity_score_caps_at_100(self, mock_activity):
        now = timedelta(days=0)
        activity = MagicMock()
        activity.start = now
        activity.end = now + timedelta(minutes=420)  # 60 min/day average

        queryset = MagicMock()
        queryset.exists.return_value = True
        queryset.__iter__.return_value = iter([activity])
        mock_activity.objects.filter.return_value = queryset

        result = HealthScoreService._calculate_activity_score(user=object())

        self.assertEqual(result, 100)
