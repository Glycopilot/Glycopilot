"""Tests for devices app — Device CRUD."""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.devices.models import Device
from apps.users.models import AuthAccount
from apps.users.models import User as UserIdentity

# ─── Helpers ────────────────────────────────────────────────────────────────


def _make_user(email="device_user@test.com", password="pass123"):
    identity = UserIdentity.objects.create(first_name="Device", last_name="Tester")
    return AuthAccount.objects.create_user(
        email=email, password=password, user_identity=identity
    )


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def _device_payload(**kwargs):
    defaults = {
        "name": "Dexcom G6",
        "device_type": Device.DeviceType.CGM,
        "provider": Device.Provider.DEXCOM,
    }
    defaults.update(kwargs)
    return defaults


# ─── DeviceViewSet ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestDeviceViewSet:
    def test_create_device(self):
        user = _make_user()
        client = _auth_client(user)

        resp = client.post("/api/devices/", _device_payload())
        assert resp.status_code == status.HTTP_201_CREATED
        assert Device.objects.filter(user=user).count() == 1
        assert resp.data["name"] == "Dexcom G6"

    def test_list_devices_only_own(self):
        user1 = _make_user("dev1@test.com")
        user2 = _make_user("dev2@test.com")
        Device.objects.create(
            user=user1, name="G6", device_type="cgm", provider="dexcom"
        )

        client = _auth_client(user2)
        resp = client.get("/api/devices/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) == 0

    def test_list_own_devices(self):
        user = _make_user()
        Device.objects.create(
            user=user, name="Libre 3", device_type="cgm", provider="freestyle"
        )
        client = _auth_client(user)

        resp = client.get("/api/devices/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) == 1
        assert data[0]["name"] == "Libre 3"

    def test_retrieve_device(self):
        user = _make_user()
        device = Device.objects.create(
            user=user, name="Simulator", device_type="simulator", provider="simulator"
        )
        client = _auth_client(user)

        resp = client.get(f"/api/devices/{device.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Simulator"

    def test_update_device(self):
        user = _make_user()
        device = Device.objects.create(
            user=user, name="Old Name", device_type="cgm", provider="dexcom"
        )
        client = _auth_client(user)

        resp = client.patch(f"/api/devices/{device.id}/", {"name": "New Name"})
        assert resp.status_code == status.HTTP_200_OK
        device.refresh_from_db()
        assert device.name == "New Name"

    def test_delete_device(self):
        user = _make_user()
        device = Device.objects.create(
            user=user, name="ToDelete", device_type="cgm", provider="other"
        )
        client = _auth_client(user)

        resp = client.delete(f"/api/devices/{device.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert Device.objects.filter(id=device.id).count() == 0

    def test_unauthenticated_cannot_access_devices(self):
        client = APIClient()
        resp = client.get("/api/devices/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_device_with_optional_fields(self):
        user = _make_user()
        client = _auth_client(user)

        resp = client.post(
            "/api/devices/",
            {
                "name": "Dexcom G7",
                "device_type": "cgm",
                "provider": "dexcom",
                "model": "G7",
                "serial_number": "SN-12345",
                "sampling_interval_sec": 300,
                "timezone": "Europe/Paris",
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["model"] == "G7"
        assert resp.data["serial_number"] == "SN-12345"
