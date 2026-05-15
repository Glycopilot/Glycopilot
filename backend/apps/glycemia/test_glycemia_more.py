from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.glycemia.models import Glycemia, GlycemiaHisto

User = get_user_model()


class GlycemiaCGMReadingsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="cgm-more@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)

    def test_create_cgm_reading_returns_201(self):
        payload = {
            "measured_at": timezone.now().isoformat(),
            "value": 110.0,
            "unit": "mg/dL",
            "source": "cgm",
        }
        response = self.client.post("/api/glycemia/cgm-readings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(GlycemiaHisto.objects.filter(user=self.user, value=110.0).exists())
        # Also added to Glycemia 30-day cache
        self.assertTrue(Glycemia.objects.filter(user=self.user, value=110.0).exists())

    def test_create_cgm_reading_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/glycemia/cgm-readings/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_cgm_reading_rejects_invalid_data(self):
        response = self.client.post("/api/glycemia/cgm-readings/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class GlycemiaRangeWithStatsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="range-stats@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)

    def test_range_with_single_entry_median_equals_value(self):
        Glycemia.objects.create(
            user=self.user, measured_at=timezone.now(), value=120.0, unit="mg/dL", source="manual"
        )
        response = self.client.get("/api/glycemia/range/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stats = response.data.get("stats", {})
        self.assertEqual(stats["median"], 120.0)
        self.assertEqual(stats["min"], 120.0)
        self.assertEqual(stats["max"], 120.0)

    def test_range_filter_by_days(self):
        Glycemia.objects.create(
            user=self.user, measured_at=timezone.now(), value=130.0, unit="mg/dL", source="manual"
        )
        response = self.client.get("/api/glycemia/range/?days=7")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("entries", response.data)

    def test_manual_reading_also_creates_in_glycemia_cache(self):
        payload = {
            "measured_at": timezone.now().isoformat(),
            "value": 95.0,
            "unit": "mg/dL",
            "context": "fasting",
        }
        self.client.post("/api/glycemia/manual-readings/", payload, format="json")
        self.assertTrue(Glycemia.objects.filter(user=self.user, value=95.0).exists())
