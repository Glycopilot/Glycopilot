from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils.timezone import now, timedelta

import pytest
from rest_framework.test import APIClient

from apps.devices.models import Device
from apps.glycemia.models import Glycemia, GlycemiaDataIA, GlycemiaHisto
from apps.glycemia.signals import HYPER_THRESHOLD, HYPO_THRESHOLD

User = get_user_model()


# ─── Fixtures ────────────────────────────────────────────────────


@pytest.fixture
def user(db):
    return User.objects.create_user(email="test@example.com", password="pass1234")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(email="other@example.com", password="pass1234")


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def unauth_client():
    return APIClient()


@pytest.fixture
def device(user):
    return Device.objects.create(
        user=user,
        name="Dexcom G6",
        device_type="cgm",
        provider="dexcom",
    )


# ═══════════════════════════════════════════════════════════════════
# 1. MODÈLES
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestGlycemiaModels:
    def test_glycemia_str(self, user):
        g = Glycemia.objects.create(
            user=user,
            measured_at=now(),
            value=120,
        )
        assert "test@example.com" in str(g)
        assert "120" in str(g)

    def test_glycemia_histo_str(self, user):
        h = GlycemiaHisto.objects.create(
            user=user,
            measured_at=now(),
            value=95,
        )
        assert "test@example.com" in str(h)
        assert "95" in str(h)

    def test_glycemia_histo_reading_id_is_unique(self, user):
        h1 = GlycemiaHisto.objects.create(user=user, measured_at=now(), value=100)
        h2 = GlycemiaHisto.objects.create(user=user, measured_at=now(), value=110)
        assert h1.reading_id != h2.reading_id

    def test_glycemia_ordering(self, user):
        old = Glycemia.objects.create(
            user=user,
            measured_at=now() - timedelta(hours=2),
            value=100,
        )
        recent = Glycemia.objects.create(
            user=user,
            measured_at=now(),
            value=200,
        )
        qs = Glycemia.objects.filter(user=user)
        assert qs.first().pk == recent.pk

    def test_glycemia_with_device(self, user, device):
        g = Glycemia.objects.create(
            user=user,
            device=device,
            measured_at=now(),
            value=130,
        )
        assert g.device == device
        assert device.glycemia_cache.count() == 1

    def test_glycemia_device_set_null_on_delete(self, user, device):
        g = Glycemia.objects.create(
            user=user,
            device=device,
            measured_at=now(),
            value=130,
        )
        device.delete()
        g.refresh_from_db()
        assert g.device is None

    def test_glycemia_cascade_on_user_delete(self, user):
        Glycemia.objects.create(user=user, measured_at=now(), value=100)
        GlycemiaHisto.objects.create(user=user, measured_at=now(), value=100)
        user.delete()
        assert Glycemia.objects.count() == 0
        assert GlycemiaHisto.objects.count() == 0

    def test_glycemia_data_ia_str(self, user):
        t = now()
        ia = GlycemiaDataIA.objects.create(
            user=user,
            for_time=t,
            input_start=t - timedelta(hours=2),
            input_end=t,
            model_version="v1.0",
        )
        assert "test@example.com" in str(ia)
        assert "v1.0" in str(ia)

    def test_glycemia_data_ia_unique_constraint(self, user):
        t = now()
        GlycemiaDataIA.objects.create(
            user=user,
            for_time=t,
            input_start=t - timedelta(hours=2),
            input_end=t,
            model_version="v1.0",
        )
        from django.db import IntegrityError

        with pytest.raises(IntegrityError):
            GlycemiaDataIA.objects.create(
                user=user,
                for_time=t,
                input_start=t - timedelta(hours=2),
                input_end=t,
                model_version="v1.0",
            )


# ═══════════════════════════════════════════════════════════════════
# 2. API – CRUD & ACTIONS
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestGlycemiaAPI:
    # ── manual-readings ──────────────────────────────────────────

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

    def test_manual_readings_value_too_low(self, client):
        payload = {
            "value": 10,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
        }
        r = client.post("/api/glycemia/manual-readings/", payload, format="json")
        assert r.status_code == 400

    def test_manual_readings_value_too_high(self, client):
        payload = {
            "value": 700,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
        }
        r = client.post("/api/glycemia/manual-readings/", payload, format="json")
        assert r.status_code == 400

    def test_manual_readings_boundary_low(self, client):
        payload = {
            "value": 20,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
        }
        r = client.post("/api/glycemia/manual-readings/", payload, format="json")
        assert r.status_code == 201

    def test_manual_readings_boundary_high(self, client):
        payload = {
            "value": 600,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
        }
        r = client.post("/api/glycemia/manual-readings/", payload, format="json")
        assert r.status_code == 201

    def test_manual_readings_source_is_manual(self, client, user):
        payload = {
            "value": 120,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
        }
        client.post("/api/glycemia/manual-readings/", payload, format="json")
        assert GlycemiaHisto.objects.get(user=user).source == "manual"
        assert Glycemia.objects.get(user=user).source == "manual"

    # ── current ──────────────────────────────────────────────────

    def test_current_returns_latest_value(self, client, user):
        Glycemia.objects.create(
            user=user,
            measured_at=now() - timedelta(hours=1),
            value=120,
        )
        Glycemia.objects.create(user=user, measured_at=now(), value=180)
        r = client.get("/api/glycemia/current/")
        assert r.status_code == 200
        assert r.data["value"] == 180

    def test_current_fallback_to_histo(self, client, user):
        GlycemiaHisto.objects.create(
            user=user,
            measured_at=now() - timedelta(days=60),
            value=99,
        )
        r = client.get("/api/glycemia/current/")
        assert r.status_code == 200
        assert r.data["value"] == 99

    def test_current_no_readings_returns_404(self, client):
        r = client.get("/api/glycemia/current/")
        assert r.status_code == 404

    # ── range ────────────────────────────────────────────────────

    def test_range_returns_correct_amount(self, client, user):
        for d in range(5):
            GlycemiaHisto.objects.create(
                user=user,
                measured_at=now() - timedelta(days=d),
                value=100 + d,
            )
        r = client.get("/api/glycemia/range/?days=3")
        assert r.status_code == 200
        assert len(r.data["entries"]) == 3

    def test_range_returns_stats(self, client, user):
        for v in [80, 100, 120]:
            GlycemiaHisto.objects.create(
                user=user,
                measured_at=now() - timedelta(hours=v),
                value=v,
            )
        r = client.get("/api/glycemia/range/?days=7")
        assert r.status_code == 200
        stats = r.data["stats"]
        assert stats["min"] == 80
        assert stats["max"] == 120
        assert stats["count"] == 3

    def test_range_empty_returns_empty_stats(self, client):
        r = client.get("/api/glycemia/range/?days=7")
        assert r.status_code == 200
        assert r.data["entries"] == []
        assert r.data["stats"] == {}

    def test_range_invalid_days(self, client):
        assert client.get("/api/glycemia/range/?days=40").status_code == 400
        assert client.get("/api/glycemia/range/?days=0").status_code == 400

    def test_range_default_days(self, client, user):
        for d in range(10):
            GlycemiaHisto.objects.create(
                user=user,
                measured_at=now() - timedelta(days=d),
                value=100,
            )
        r = client.get("/api/glycemia/range/")
        assert r.status_code == 200
        assert r.data["range_days"] == 7

    # ── cleanup ──────────────────────────────────────────────────

    def test_cleanup_removes_old_entries(self, client, user):
        Glycemia.objects.create(
            user=user,
            measured_at=now() - timedelta(days=40),
            value=110,
        )
        payload = {
            "value": 150,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
            "context": "preprandial",
        }
        r = client.post("/api/glycemia/manual-readings/", payload, format="json")
        assert r.status_code == 201
        assert Glycemia.objects.filter(user=user).count() == 1

    def test_cleanup_keeps_recent_entries(self, client, user):
        Glycemia.objects.create(
            user=user,
            measured_at=now() - timedelta(days=10),
            value=100,
        )
        payload = {
            "value": 150,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
        }
        client.post("/api/glycemia/manual-readings/", payload, format="json")
        assert Glycemia.objects.filter(user=user).count() == 2

    # ── CRUD histo (list/retrieve/update/delete) ─────────────────

    def test_list_returns_user_histo(self, client, user):
        GlycemiaHisto.objects.create(user=user, measured_at=now(), value=110)
        GlycemiaHisto.objects.create(user=user, measured_at=now(), value=120)
        r = client.get("/api/glycemia/")
        assert r.status_code == 200
        assert len(r.data["results"]) == 2 if "results" in r.data else len(r.data) == 2

    def test_delete_histo_entry(self, client, user):
        h = GlycemiaHisto.objects.create(user=user, measured_at=now(), value=110)
        r = client.delete(f"/api/glycemia/{h.pk}/")
        assert r.status_code == 204
        assert GlycemiaHisto.objects.filter(pk=h.pk).count() == 0

    # ── isolation entre utilisateurs ─────────────────────────────

    def test_user_cannot_see_other_user_data(self, client, other_user):
        Glycemia.objects.create(
            user=other_user,
            measured_at=now(),
            value=200,
        )
        GlycemiaHisto.objects.create(
            user=other_user,
            measured_at=now(),
            value=200,
        )
        assert client.get("/api/glycemia/current/").status_code == 404
        r = client.get("/api/glycemia/")
        data = r.data["results"] if "results" in r.data else r.data
        assert len(data) == 0

    # ── authentification requise ─────────────────────────────────

    def test_unauthenticated_access_denied(self, unauth_client):
        assert unauth_client.get("/api/glycemia/").status_code == 401
        assert unauth_client.get("/api/glycemia/current/").status_code == 401
        assert unauth_client.get("/api/glycemia/range/").status_code == 401
        assert (
            unauth_client.post("/api/glycemia/manual-readings/", {}).status_code == 401
        )


# ═══════════════════════════════════════════════════════════════════
# 3. SIGNALS – WebSocket broadcasts
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestGlycemiaSignals:
    @patch("apps.glycemia.signals.get_channel_layer")
    def test_broadcast_on_create(self, mock_layer, user):
        mock_send = mock_layer.return_value.group_send
        GlycemiaHisto.objects.create(
            user=user,
            measured_at=now(),
            value=120,
        )
        mock_send.assert_called_once()
        call_args = mock_send.call_args[0]
        assert f"glycemia_user_{user.id_auth}" == call_args[0]
        assert call_args[1]["type"] == "glycemia_update"

    @patch("apps.glycemia.signals.get_channel_layer")
    def test_no_broadcast_on_update(self, mock_layer, user):
        h = GlycemiaHisto.objects.create(
            user=user,
            measured_at=now(),
            value=120,
        )
        mock_layer.return_value.group_send.reset_mock()
        h.value = 130
        h.save()
        mock_layer.return_value.group_send.assert_not_called()

    @patch("apps.glycemia.signals.get_channel_layer")
    def test_hypo_alert_sent(self, mock_layer, user):
        mock_send = mock_layer.return_value.group_send
        GlycemiaHisto.objects.create(
            user=user,
            measured_at=now(),
            value=HYPO_THRESHOLD - 1,
        )
        assert mock_send.call_count == 2
        alert_call = mock_send.call_args_list[1][0][1]
        assert alert_call["type"] == "glycemia_alert"
        assert alert_call["alert_type"] == "hypoglycemia"

    @patch("apps.glycemia.signals.get_channel_layer")
    def test_hyper_alert_sent(self, mock_layer, user):
        mock_send = mock_layer.return_value.group_send
        GlycemiaHisto.objects.create(
            user=user,
            measured_at=now(),
            value=HYPER_THRESHOLD + 1,
        )
        assert mock_send.call_count == 2
        alert_call = mock_send.call_args_list[1][0][1]
        assert alert_call["type"] == "glycemia_alert"
        assert alert_call["alert_type"] == "hyperglycemia"

    @patch("apps.glycemia.signals.get_channel_layer")
    def test_no_alert_for_normal_value(self, mock_layer, user):
        mock_send = mock_layer.return_value.group_send
        GlycemiaHisto.objects.create(
            user=user,
            measured_at=now(),
            value=100,
        )
        assert mock_send.call_count == 1  # only glycemia_update, no alert

    @patch("apps.glycemia.signals.get_channel_layer")
    def test_no_crash_when_channel_layer_none(self, mock_layer, user):
        mock_layer.return_value = None
        GlycemiaHisto.objects.create(
            user=user,
            measured_at=now(),
            value=50,
        )
        # Should not raise


# ═══════════════════════════════════════════════════════════════════
# 4. SERIALIZERS
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestGlycemiaSerializers:
    def test_histo_create_serializer_valid(self):
        from apps.glycemia.serializers import GlycemiaHistoCreateSerializer

        data = {
            "value": 120,
            "unit": "mg/dL",
            "measured_at": now().isoformat(),
            "context": "fasting",
        }
        s = GlycemiaHistoCreateSerializer(data=data)
        assert s.is_valid(), s.errors

    def test_histo_create_serializer_rejects_invalid_value(self):
        from apps.glycemia.serializers import GlycemiaHistoCreateSerializer

        for bad_value in [19, 601]:
            data = {
                "value": bad_value,
                "unit": "mg/dL",
                "measured_at": now().isoformat(),
            }
            s = GlycemiaHistoCreateSerializer(data=data)
            assert not s.is_valid()
            assert "value" in s.errors

    def test_glycemia_serializer_includes_email(self, user):
        from apps.glycemia.serializers import GlycemiaSerializer

        g = Glycemia.objects.create(user=user, measured_at=now(), value=100)
        data = GlycemiaSerializer(g).data
        assert data["user_email"] == "test@example.com"

    def test_data_ia_serializer_read_only_fields(self):
        from apps.glycemia.serializers import GlycemiaDataIASerializer

        s = GlycemiaDataIASerializer()
        assert "id" in s.Meta.read_only_fields
        assert "created_at" in s.Meta.read_only_fields
