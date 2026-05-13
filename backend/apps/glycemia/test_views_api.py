from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.glycemia.models import Glycemia, GlycemiaHisto

User = get_user_model()


class GlycemiaCurrentViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="gly-api@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)

    def test_current_returns_404_when_no_readings(self):
        response = self.client.get("/api/glycemia/current/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_current_returns_latest_glycemia_reading(self):
        Glycemia.objects.create(
            user=self.user,
            measured_at=timezone.now(),
            value=112.0,
            unit="mg/dL",
            source="manual",
        )
        response = self.client.get("/api/glycemia/current/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(float(response.data["value"]), 112.0)

    def test_current_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/glycemia/current/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class GlycemiaRangeViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="gly-range@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)

    def test_range_returns_200_with_empty_entries(self):
        response = self.client.get("/api/glycemia/range/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("entries", response.data)
        self.assertEqual(response.data["entries"], [])

    def test_range_returns_entry_after_creating_glycemia(self):
        Glycemia.objects.create(
            user=self.user,
            measured_at=timezone.now(),
            value=105.0,
            unit="mg/dL",
            source="manual",
        )
        response = self.client.get("/api/glycemia/range/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["entries"]), 1)

    def test_range_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/glycemia/range/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ManualReadingCreateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="manual@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)

    def test_create_manual_reading_returns_201(self):
        payload = {
            "measured_at": timezone.now().isoformat(),
            "value": 98.0,
            "unit": "mg/dL",
            "context": "fasting",
        }
        response = self.client.post("/api/glycemia/manual-readings/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_manual_reading_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.post("/api/glycemia/manual-readings/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
