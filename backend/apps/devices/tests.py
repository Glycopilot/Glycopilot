from django.contrib.auth import get_user_model
from django.utils.timezone import now

import pytest
from rest_framework.test import APIClient

from apps.devices.models import Device

User = get_user_model()


# ─── Fixtures ────────────────────────────────────────────────────

@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="device-owner@example.com", password="pass1234"
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="other@example.com", password="pass1234"
    )


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
        model="G6",
        serial_number="SN-123456",
        sampling_interval_sec=300,
        timezone="Europe/Paris",
    )


@pytest.fixture
def device_payload():
    return {
        "name": "FreeStyle Libre 3",
        "device_type": "cgm",
        "provider": "freestyle",
        "model": "Libre 3",
        "serial_number": "FS-789",
        "sampling_interval_sec": 60,
        "timezone": "Europe/Paris",
    }


# ═══════════════════════════════════════════════════════════════════
# 1. MODÈLE
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestDeviceModel:

    def test_str_representation(self, device):
        assert "Dexcom G6" in str(device)
        assert "dexcom" in str(device)

    def test_uuid_primary_key(self, device):
        import uuid
        assert isinstance(device.pk, uuid.UUID)

    def test_default_values(self, user):
        d = Device.objects.create(user=user, name="Test")
        assert d.is_active is True
        assert d.device_type == "cgm"
        assert d.provider == "other"

    def test_ordering_by_created_at_desc(self, user):
        d1 = Device.objects.create(user=user, name="First")
        d2 = Device.objects.create(user=user, name="Second")
        qs = Device.objects.filter(user=user)
        assert qs.first().pk == d2.pk

    def test_cascade_on_user_delete(self, user, device):
        user.delete()
        assert Device.objects.filter(pk=device.pk).count() == 0

    def test_device_type_choices(self):
        choices = [c[0] for c in Device.DeviceType.choices]
        assert "cgm" in choices
        assert "manual" in choices
        assert "simulator" in choices

    def test_provider_choices(self):
        choices = [c[0] for c in Device.Provider.choices]
        assert "dexcom" in choices
        assert "freestyle" in choices
        assert "simulator" in choices
        assert "other" in choices

    def test_optional_fields_nullable(self, user):
        d = Device.objects.create(user=user, name="Minimal")
        assert d.model is None
        assert d.serial_number is None
        assert d.started_at is None
        assert d.ended_at is None
        assert d.sampling_interval_sec is None
        assert d.timezone is None


# ═══════════════════════════════════════════════════════════════════
# 2. API – CRUD
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestDeviceAPI:

    # ── CREATE ───────────────────────────────────────────────────

    def test_create_device(self, client, user, device_payload):
        r = client.post("/api/devices/", device_payload, format="json")
        assert r.status_code == 201
        assert r.data["name"] == "FreeStyle Libre 3"
        assert Device.objects.filter(user=user).count() == 1

    def test_create_device_auto_assigns_user(self, client, user, device_payload):
        client.post("/api/devices/", device_payload, format="json")
        d = Device.objects.get(user=user)
        assert d.user == user

    def test_create_device_minimal_payload(self, client, user):
        r = client.post("/api/devices/", {"name": "Simple"}, format="json")
        assert r.status_code == 201
        d = Device.objects.get(user=user)
        assert d.name == "Simple"
        assert d.device_type == "cgm"
        assert d.provider == "other"

    def test_create_device_missing_name(self, client):
        r = client.post("/api/devices/", {}, format="json")
        assert r.status_code == 400

    def test_create_device_id_is_read_only(self, client, device_payload):
        device_payload["id"] = "00000000-0000-0000-0000-000000000001"
        r = client.post("/api/devices/", device_payload, format="json")
        assert r.status_code == 201
        assert r.data["id"] != "00000000-0000-0000-0000-000000000001"

    # ── LIST ─────────────────────────────────────────────────────

    def test_list_devices(self, client, device):
        r = client.get("/api/devices/")
        assert r.status_code == 200
        data = r.data["results"] if "results" in r.data else r.data
        assert len(data) == 1
        assert data[0]["name"] == "Dexcom G6"

    def test_list_empty(self, client):
        r = client.get("/api/devices/")
        assert r.status_code == 200
        data = r.data["results"] if "results" in r.data else r.data
        assert len(data) == 0

    # ── RETRIEVE ─────────────────────────────────────────────────

    def test_retrieve_device(self, client, device):
        r = client.get(f"/api/devices/{device.pk}/")
        assert r.status_code == 200
        assert r.data["name"] == "Dexcom G6"
        assert r.data["serial_number"] == "SN-123456"

    def test_retrieve_nonexistent_device(self, client):
        import uuid
        r = client.get(f"/api/devices/{uuid.uuid4()}/")
        assert r.status_code == 404

    # ── UPDATE (PUT) ─────────────────────────────────────────────

    def test_update_device(self, client, device):
        r = client.put(
            f"/api/devices/{device.pk}/",
            {
                "name": "Dexcom G7",
                "device_type": "cgm",
                "provider": "dexcom",
                "is_active": True,
            },
            format="json",
        )
        assert r.status_code == 200
        device.refresh_from_db()
        assert device.name == "Dexcom G7"

    # ── PARTIAL UPDATE (PATCH) ───────────────────────────────────

    def test_patch_device(self, client, device):
        r = client.patch(
            f"/api/devices/{device.pk}/",
            {"is_active": False},
            format="json",
        )
        assert r.status_code == 200
        device.refresh_from_db()
        assert device.is_active is False

    def test_patch_device_name(self, client, device):
        r = client.patch(
            f"/api/devices/{device.pk}/",
            {"name": "Updated Name"},
            format="json",
        )
        assert r.status_code == 200
        assert r.data["name"] == "Updated Name"

    # ── DELETE ───────────────────────────────────────────────────

    def test_delete_device(self, client, device):
        r = client.delete(f"/api/devices/{device.pk}/")
        assert r.status_code == 204
        assert Device.objects.filter(pk=device.pk).count() == 0

    def test_delete_nonexistent_device(self, client):
        import uuid
        r = client.delete(f"/api/devices/{uuid.uuid4()}/")
        assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════════
# 3. ISOLATION ENTRE UTILISATEURS
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestDeviceIsolation:

    def test_user_cannot_list_other_user_devices(self, client, other_user):
        Device.objects.create(user=other_user, name="Other Device")
        r = client.get("/api/devices/")
        data = r.data["results"] if "results" in r.data else r.data
        assert len(data) == 0

    def test_user_cannot_retrieve_other_user_device(self, client, other_user):
        d = Device.objects.create(user=other_user, name="Other Device")
        r = client.get(f"/api/devices/{d.pk}/")
        assert r.status_code == 404

    def test_user_cannot_update_other_user_device(self, client, other_user):
        d = Device.objects.create(user=other_user, name="Other Device")
        r = client.patch(
            f"/api/devices/{d.pk}/",
            {"name": "Hacked"},
            format="json",
        )
        assert r.status_code == 404
        d.refresh_from_db()
        assert d.name == "Other Device"

    def test_user_cannot_delete_other_user_device(self, client, other_user):
        d = Device.objects.create(user=other_user, name="Other Device")
        r = client.delete(f"/api/devices/{d.pk}/")
        assert r.status_code == 404
        assert Device.objects.filter(pk=d.pk).exists()


# ═══════════════════════════════════════════════════════════════════
# 4. AUTHENTIFICATION
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestDeviceAuth:

    def test_unauthenticated_list(self, unauth_client):
        assert unauth_client.get("/api/devices/").status_code == 401

    def test_unauthenticated_create(self, unauth_client):
        r = unauth_client.post("/api/devices/", {"name": "X"}, format="json")
        assert r.status_code == 401

    def test_unauthenticated_retrieve(self, unauth_client, device):
        r = unauth_client.get(f"/api/devices/{device.pk}/")
        assert r.status_code == 401

    def test_unauthenticated_delete(self, unauth_client, device):
        r = unauth_client.delete(f"/api/devices/{device.pk}/")
        assert r.status_code == 401


# ═══════════════════════════════════════════════════════════════════
# 5. SERIALIZER
# ═══════════════════════════════════════════════════════════════════

@pytest.mark.django_db
class TestDeviceSerializer:

    def test_serializer_fields(self, device):
        from apps.devices.serializers import DeviceSerializer
        data = DeviceSerializer(device).data
        assert "id" in data
        assert "name" in data
        assert "device_type" in data
        assert "provider" in data
        assert "model" in data
        assert "serial_number" in data
        assert "is_active" in data
        assert "created_at" in data
        # user ne doit pas apparaître dans la réponse
        assert "user" not in data

    def test_serializer_read_only_fields(self):
        from apps.devices.serializers import DeviceSerializer
        s = DeviceSerializer()
        assert "id" in s.Meta.read_only_fields
        assert "created_at" in s.Meta.read_only_fields
