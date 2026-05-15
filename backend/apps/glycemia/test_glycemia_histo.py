from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.glycemia.models import GlycemiaHisto

User = get_user_model()


class GlycemiaHistoViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="histo-api@test.com", password="pass123")
        self.other = User.objects.create_user(email="histo-other@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)

    def test_list_history_returns_200(self):
        response = self.client.get("/api/glycemia/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_history_only_returns_own_entries(self):
        GlycemiaHisto.objects.create(
            user=self.user, measured_at=timezone.now(), value=115.0, unit="mg/dL", source="manual"
        )
        GlycemiaHisto.objects.create(
            user=self.other, measured_at=timezone.now(), value=130.0, unit="mg/dL", source="manual"
        )
        response = self.client.get("/api/glycemia/")
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_history_filter_by_measured_after(self):
        past = (timezone.now() - timezone.timedelta(days=10)).isoformat()
        GlycemiaHisto.objects.create(
            user=self.user, measured_at=timezone.now(), value=100.0, unit="mg/dL", source="manual"
        )
        response = self.client.get(f"/api/glycemia/?measured_after={past}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_create_via_list_endpoint(self):
        payload = {
            "measured_at": timezone.now().isoformat(),
            "value": 105.0,
            "unit": "mg/dL",
            "source": "manual",
        }
        response = self.client.post("/api/glycemia/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/glycemia/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
