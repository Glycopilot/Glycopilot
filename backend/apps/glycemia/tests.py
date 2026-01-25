from django.contrib.auth import get_user_model
from django.utils.timezone import now, timedelta

import pytest
from rest_framework.test import APIClient

from apps.glycemia.models import Glycemia, GlycemiaHisto

User = get_user_model()


@pytest.mark.django_db
class TestGlycemiaAPI:
    @pytest.fixture
    def user(self):
        return User.objects.create_user(
            email="test@example.com", password="pass1234"
        )

    @pytest.fixture
    def client(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        return client

    # 1. TEST AJOUT MANUEL
    def test_manual_readings_inserts_into_both_tables(self, client, user):
        payload = {
            "value": 150,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
            "context": "preprandial",
            "notes": "Test",
        }

        r = client.post("/api/glycemia/manual-readings/", payload, format="json")
        assert r.status_code == 201

        assert GlycemiaHisto.objects.filter(user=user).count() == 1
        assert Glycemia.objects.filter(user=user).count() == 1

    # 2. TEST TEMPS RÉEL
    def test_current_returns_latest_value(self, client, user):
        Glycemia.objects.create(
            user=user, measured_at=now() - timedelta(hours=1), value=120
        )
        Glycemia.objects.create(user=user, measured_at=now(), value=180)

        r = client.get("/api/glycemia/current/")
        assert r.status_code == 200
        assert r.data["value"] == 180

    # 3. TEST RANGE
    def test_range_returns_correct_amount(self, client, user):
        for d in range(5):
            Glycemia.objects.create(
                user=user, measured_at=now() - timedelta(days=d), value=100 + d
            )

        r = client.get("/api/glycemia/range/?days=3")
        assert r.status_code == 200
        assert len(r.data["entries"]) == 3

    # 4. TEST RANGE INVALID
    def test_range_invalid_days(self, client):
        assert client.get("/api/glycemia/range/?days=40").status_code == 400
        assert client.get("/api/glycemia/range/?days=0").status_code == 400

    # 5. TEST CLEANUP
    def test_cleanup_removes_old_entries(self, client, user):
        Glycemia.objects.create(
            user=user, measured_at=now() - timedelta(days=40), value=110
        )

        payload = {
            "value": 150,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
            "context": "preprandial",
        }

        r = client.post("/api/glycemia/manual-readings/", payload, format="json")
        assert r.status_code == 201

        # L'ancienne entrée doit avoir été supprimée
        assert Glycemia.objects.filter(user=user).count() == 1
