from datetime import timedelta
from types import SimpleNamespace

from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate
from django.test import TestCase

from apps.activities.models import Activity, UserActivity
from apps.activities.serializers import ActivitySerializer, UserActivitySerializer
from apps.activities.views import ActivityViewSet, UserActivityViewSet
from apps.alerts.models import AlertEvent, AlertRule, UserAlertRule
from apps.alerts.views import AlertHistoryViewSet, AlertRuleViewSet, UserAlertSettingsViewSet
from apps.devices.models import Device
from apps.devices.views import DeviceViewSet
from apps.users.models import AuthAccount


class ActivityAlertDeviceCoverageTests(TestCase):
    def setUp(self):
        self.user = AuthAccount.objects.create_user(
            email="cov@test.com", password="pass123"
        )

    def test_activity_serializers(self):
        activity = Activity.objects.create(
            name="Run", calories_burned=100, sugar_used=1.5
        )
        start = timezone.now()
        serializer = UserActivitySerializer(
            data={
                "activity": activity.activity_id,
                "start": start,
                "duration_minutes": 30,
                "intensity": "moderate",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        obj = serializer.save(user=self.user)
        data = UserActivitySerializer(obj).data
        self.assertIn("duration_minutes", data)
        self.assertGreater(int(data["duration_minutes"]), 0)
        self.assertGreaterEqual(data["total_calories_burned"], 0)
        self.assertGreaterEqual(float(data["total_sugar_used"]), 0.0)

        ref_data = ActivitySerializer(activity).data
        self.assertEqual(ref_data["name"], "Run")

    def test_activity_viewsets(self):
        activity = Activity.objects.create(name="Walk")
        factory = APIRequestFactory()
        request = factory.get("/api/activities/types/")
        force_authenticate(request, user=self.user)
        response = ActivityViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)

        request = factory.post(
            "/api/activities/history/",
            {"activity": activity.activity_id, "start": timezone.now(), "duration_minutes": 10},
        )
        force_authenticate(request, user=self.user)
        response = UserActivityViewSet.as_view({"post": "create"})(request)
        self.assertEqual(response.status_code, 201)

        request = factory.get("/api/activities/history/")
        force_authenticate(request, user=self.user)
        response = UserActivityViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)

    def test_alerts_viewsets(self):
        rule = AlertRule.objects.create(
            code="TEST",
            name="Test",
            min_glycemia=70,
            max_glycemia=180,
            severity=3,
            is_active=True,
        )
        event = AlertEvent.objects.create(
            user=self.user, rule=rule, glycemia_value=65, status="TRIGGERED"
        )

        factory = APIRequestFactory()
        request = factory.get("/api/alerts/rules/")
        force_authenticate(request, user=self.user)
        response = AlertRuleViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)

        request = factory.get("/api/alerts/settings/")
        force_authenticate(request, user=self.user)
        response = UserAlertSettingsViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)

        serializer = UserAlertSettingsViewSet.serializer_class(
            data={"rule": rule.id, "rule_id": rule.id, "enabled": True}
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        viewset = UserAlertSettingsViewSet()
        viewset.request = SimpleNamespace(user=self.user)
        viewset.perform_create(serializer)

        request = factory.get("/api/alerts/history/")
        force_authenticate(request, user=self.user)
        response = AlertHistoryViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)

        request = factory.post("/api/alerts/events/treat/", {"event_id": event.id})
        force_authenticate(request, user=self.user)
        response = AlertHistoryViewSet.as_view({"post": "treat"})(request)
        self.assertEqual(response.status_code, 200)

        request = factory.post("/api/alerts/events/ack/", {"event_id": event.id})
        force_authenticate(request, user=self.user)
        response = AlertHistoryViewSet.as_view({"post": "ack"})(request)
        self.assertEqual(response.status_code, 200)

        request = factory.post("/api/alerts/events/ack/", {})
        force_authenticate(request, user=self.user)
        response = AlertHistoryViewSet.as_view({"post": "ack"})(request)
        self.assertEqual(response.status_code, 400)

        request = factory.post("/api/alerts/events/treat/", {})
        force_authenticate(request, user=self.user)
        response = AlertHistoryViewSet.as_view({"post": "treat"})(request)
        self.assertEqual(response.status_code, 400)

        request = factory.post("/api/alerts/events/treat/", {"event_id": 999999})
        force_authenticate(request, user=self.user)
        response = AlertHistoryViewSet.as_view({"post": "treat"})(request)
        self.assertEqual(response.status_code, 404)

        request = factory.post("/api/alerts/events/ack/", {"event_id": 999999})
        force_authenticate(request, user=self.user)
        response = AlertHistoryViewSet.as_view({"post": "ack"})(request)
        self.assertEqual(response.status_code, 404)

    def test_device_viewset(self):
        device = Device.objects.create(
            user=self.user, name="Dexcom", provider="dexcom"
        )
        factory = APIRequestFactory()
        request = factory.get("/api/devices/")
        force_authenticate(request, user=self.user)
        response = DeviceViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)

        request = factory.post("/api/devices/", {"name": "Libre", "provider": "other"})
        force_authenticate(request, user=self.user)
        response = DeviceViewSet.as_view({"post": "create"})(request)
        self.assertEqual(response.status_code, 201)
