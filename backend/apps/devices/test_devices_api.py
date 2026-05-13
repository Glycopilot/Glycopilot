from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.devices.models import Device

User = get_user_model()


class DeviceViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="dev-user@test.com", password="pass123")
        self.other = User.objects.create_user(email="dev-other@test.com", password="pass123")
        # Clean up any devices left by other test suites (e.g. pytest fixtures)
        Device.objects.filter(user=self.user).delete()
        Device.objects.filter(user=self.other).delete()
        self.client.force_authenticate(user=self.user)

    # ── list ──────────────────────────────────────────────────────────────

    def test_list_returns_only_own_devices(self):
        Device.objects.create(user=self.user, name="Dexcom G6", device_type="cgm", provider="dexcom")
        Device.objects.create(user=self.other, name="Libre 3", device_type="cgm", provider="freestyle")

        response = self.client.get("/api/devices/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Dexcom G6")

    def test_list_returns_empty_when_no_devices(self):
        response = self.client.get("/api/devices/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_list_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/devices/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── create ────────────────────────────────────────────────────────────

    def test_create_device_assigns_current_user(self):
        payload = {"name": "Libre 2", "device_type": "cgm", "provider": "freestyle"}
        response = self.client.post("/api/devices/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        device = Device.objects.get(pk=response.data["id"])
        self.assertEqual(device.user, self.user)

    def test_create_device_with_optional_fields(self):
        payload = {
            "name": "Simulator",
            "device_type": "simulator",
            "provider": "simulator",
            "model": "v1",
            "sampling_interval_sec": 300,
        }
        response = self.client.post("/api/devices/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # ── retrieve ──────────────────────────────────────────────────────────

    def test_retrieve_own_device(self):
        device = Device.objects.create(user=self.user, name="My CGM", device_type="cgm", provider="dexcom")
        response = self.client.get(f"/api/devices/{device.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "My CGM")

    def test_cannot_retrieve_other_user_device(self):
        device = Device.objects.create(user=self.other, name="Other CGM", device_type="cgm", provider="freestyle")
        response = self.client.get(f"/api/devices/{device.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ── update ────────────────────────────────────────────────────────────

    def test_partial_update_device_name(self):
        device = Device.objects.create(user=self.user, name="Old Name", device_type="cgm", provider="dexcom")
        response = self.client.patch(f"/api/devices/{device.id}/", {"name": "New Name"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        device.refresh_from_db()
        self.assertEqual(device.name, "New Name")

    # ── delete ────────────────────────────────────────────────────────────

    def test_delete_own_device(self):
        device = Device.objects.create(user=self.user, name="To Delete", device_type="cgm", provider="other")
        response = self.client.delete(f"/api/devices/{device.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Device.objects.filter(pk=device.id).exists())

    def test_cannot_delete_other_user_device(self):
        device = Device.objects.create(user=self.other, name="Other", device_type="cgm", provider="other")
        response = self.client.delete(f"/api/devices/{device.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
