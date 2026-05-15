from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.glycemia.models import Glycemia, GlycemiaDataIA, GlycemiaHisto, PredictionStatus

User = get_user_model()


class GlycemiaDataIAViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="pred-api@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)

    def test_list_predictions_returns_200_empty(self):
        response = self.client.get("/api/glycemia/predictions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_latest_prediction_returns_404_when_none(self):
        response = self.client.get("/api/glycemia/predictions/latest/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_latest_prediction_returns_200_when_exists(self):
        pred = GlycemiaDataIA.objects.create(
            user=self.user,
            for_time=timezone.now(),
            input_start=timezone.now(),
            input_end=timezone.now(),
            model_version="v1",
            source="baseline",
            status=PredictionStatus.OK,
        )
        response = self.client.get("/api/glycemia/predictions/latest/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("model_version", response.data)

    def test_filter_predictions_by_status(self):
        GlycemiaDataIA.objects.create(
            user=self.user, for_time=timezone.now(),
            input_start=timezone.now(), input_end=timezone.now(),
            model_version="v1", source="baseline", status=PredictionStatus.OK,
        )
        GlycemiaDataIA.objects.create(
            user=self.user, for_time=timezone.now(),
            input_start=timezone.now(), input_end=timezone.now(),
            model_version="v1", source="lstm", status=PredictionStatus.ERROR,
        )
        response = self.client.get("/api/glycemia/predictions/?status=ok")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        for r in results:
            self.assertEqual(r["status"], "ok")

    def test_filter_predictions_by_source(self):
        GlycemiaDataIA.objects.create(
            user=self.user, for_time=timezone.now(),
            input_start=timezone.now(), input_end=timezone.now(),
            model_version="v1", source="ensemble", status=PredictionStatus.OK,
        )
        response = self.client.get("/api/glycemia/predictions/?source=ensemble")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/glycemia/predictions/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class GlycemiaCalculateStatsTests(APITestCase):
    """Tests for the _calculate_stats helper via the range endpoint."""

    def setUp(self):
        self.user = User.objects.create_user(email="stats-api@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)

    def test_stats_with_multiple_entries(self):
        for v in [80, 100, 120, 140]:
            Glycemia.objects.create(
                user=self.user, measured_at=timezone.now(), value=v, unit="mg/dL", source="manual"
            )
        response = self.client.get("/api/glycemia/range/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stats = response.data.get("stats", {})
        self.assertEqual(stats.get("min"), 80)
        self.assertEqual(stats.get("max"), 140)
        self.assertEqual(stats.get("count"), 4)

    def test_stats_empty_when_no_entries(self):
        response = self.client.get("/api/glycemia/range/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stats = response.data.get("stats", {})
        self.assertEqual(stats, {})
