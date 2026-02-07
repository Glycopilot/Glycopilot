import json
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import jwt
from asgiref.sync import async_to_sync
from django.conf import settings
from django.test import TestCase, override_settings
from django.utils import timezone
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.glycemia.consumers import GlycemiaConsumer
from apps.glycemia.middleware import JWTAuthMiddleware, get_user_from_token
from apps.glycemia.models import Glycemia, GlycemiaHisto
from apps.glycemia.serializers import (
    GlycemiaHistoCreateSerializer,
    GlycemiaHistoSerializer,
    GlycemiaSerializer,
)
from apps.glycemia.signals import broadcast_glycemia_update
from apps.glycemia.views import GlycemiaViewSet
from apps.users.models import AuthAccount


class GlycemiaCoverageTests(TestCase):
    def setUp(self):
        self.user = AuthAccount.objects.create_user(
            email="gly@test.com", password="pass123"
        )

    def test_glycemia_serializers(self):
        entry = Glycemia.objects.create(
            user=self.user, measured_at=timezone.now(), value=100, unit="mg/dL"
        )
        data = GlycemiaSerializer(entry).data
        self.assertEqual(data["user_email"], self.user.email)
        self.assertIn(self.user.email, str(entry))

        histo = GlycemiaHisto.objects.create(
            user=self.user,
            measured_at=timezone.now(),
            value=120,
            unit="mg/dL",
            source="manual",
        )
        histo_data = GlycemiaHistoSerializer(histo).data
        self.assertEqual(histo_data["value"], 120)
        self.assertIn(self.user.email, str(histo))

        serializer = GlycemiaHistoCreateSerializer(
            data={"measured_at": timezone.now(), "value": 10, "unit": "mg/dL"}
        )
        self.assertFalse(serializer.is_valid())

        from apps.glycemia.models import GlycemiaDataIA

        ia = GlycemiaDataIA.objects.create(
            user=self.user,
            for_time=timezone.now(),
            input_start=timezone.now(),
            input_end=timezone.now(),
            model_version="v1",
        )
        self.assertIn(self.user.email, str(ia))

    def test_glycemia_views_current_range_manual(self):
        factory = APIRequestFactory()
        view = GlycemiaViewSet.as_view({"get": "current"})

        request = factory.get("/api/glycemia/current/")
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, 404)

        GlycemiaHisto.objects.create(
            user=self.user, measured_at=timezone.now(), value=110, unit="mg/dL"
        )
        response = view(request)
        self.assertEqual(response.status_code, 200)

        Glycemia.objects.create(
            user=self.user, measured_at=timezone.now(), value=95, unit="mg/dL"
        )
        response = view(request)
        self.assertEqual(response.status_code, 200)

        range_view = GlycemiaViewSet.as_view({"get": "range"})
        request = factory.get("/api/glycemia/range/?days=0")
        force_authenticate(request, user=self.user)
        response = range_view(request)
        self.assertEqual(response.status_code, 400)

        request = factory.get("/api/glycemia/range/?days=7")
        force_authenticate(request, user=self.user)
        response = range_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn("stats", response.data)

        manual_view = GlycemiaViewSet.as_view({"post": "manual_readings"})
        request = factory.post("/api/glycemia/manual-readings/", {"value": 10})
        force_authenticate(request, user=self.user)
        response = manual_view(request)
        self.assertEqual(response.status_code, 400)

        payload = {
            "measured_at": timezone.now().isoformat(),
            "value": 150,
            "unit": "mg/dL",
        }
        request = factory.post("/api/glycemia/manual-readings/", payload, format="json")
        force_authenticate(request, user=self.user)
        response = manual_view(request)
        self.assertEqual(response.status_code, 201)

    def test_glycemia_stats_and_cleanup(self):
        viewset = GlycemiaViewSet()
        empty_stats = viewset._calculate_stats([])
        self.assertEqual(empty_stats, {})

        now = timezone.now()
        entries = [
            Glycemia(user=self.user, measured_at=now, value=100, unit="mg/dL"),
            Glycemia(user=self.user, measured_at=now, value=120, unit="mg/dL"),
        ]
        stats = viewset._calculate_stats(entries)
        self.assertEqual(stats["min"], 100)

        old = Glycemia.objects.create(
            user=self.user,
            measured_at=timezone.now() - timedelta(days=120),
            value=80,
            unit="mg/dL",
        )
        viewset._clean_old_entries(self.user)
        self.assertFalse(Glycemia.objects.filter(id=old.id).exists())

    def test_glycemia_signals(self):
        histo = GlycemiaHisto.objects.create(
            user=self.user,
            measured_at=timezone.now(),
            value=60,
            unit="mg/dL",
            source="manual",
        )

        broadcast_glycemia_update(
            sender=GlycemiaHisto, instance=histo, created=False
        )

        with patch("apps.glycemia.signals.get_channel_layer", return_value=None):
            broadcast_glycemia_update(
                sender=GlycemiaHisto, instance=histo, created=True
            )

        fake_layer = Mock()
        fake_layer.group_send = AsyncMock()
        with patch("apps.glycemia.signals.get_channel_layer", return_value=fake_layer):
            broadcast_glycemia_update(
                sender=GlycemiaHisto, instance=histo, created=True
            )

        with patch(
            "apps.alerts.services.trigger.trigger_for_value",
            side_effect=Exception("boom"),
        ):
            with patch("apps.glycemia.signals.get_channel_layer", return_value=None):
                broadcast_glycemia_update(
                    sender=GlycemiaHisto, instance=histo, created=True
                )

        error_layer = Mock()
        error_layer.group_send = Mock(side_effect=Exception("send fail"))
        with patch("apps.glycemia.signals.get_channel_layer", return_value=error_layer):
            broadcast_glycemia_update(
                sender=GlycemiaHisto, instance=histo, created=True
            )

        with patch(
            "apps.alerts.services.trigger.trigger_for_value", return_value=[object()]
        ):
            with patch("apps.glycemia.signals.get_channel_layer", return_value=fake_layer):
                broadcast_glycemia_update(
                    sender=GlycemiaHisto, instance=histo, created=True
                )

    def test_glycemia_consumer(self):
        consumer = GlycemiaConsumer()
        consumer.scope = {"user": AnonymousUser()}
        consumer.close = AsyncMock()
        async_to_sync(consumer.connect)()
        consumer.close.assert_awaited()

        user = self.user
        consumer = GlycemiaConsumer()
        consumer.scope = {"user": user}
        consumer.channel_layer = SimpleNamespace(
            group_add=AsyncMock(), group_discard=AsyncMock()
        )
        consumer.channel_name = "test-channel"
        consumer.accept = AsyncMock()
        consumer.send = AsyncMock()
        async_to_sync(consumer.connect)()
        async_to_sync(consumer.receive)(text_data=json.dumps({"type": "ping"}))
        async_to_sync(consumer.receive)(text_data="not-json")
        async_to_sync(consumer.glycemia_update)(
            {"data": {"value": 100, "unit": "mg/dL"}}
        )
        async_to_sync(consumer.glycemia_alert)(
            {"alert_type": "hypoglycemia", "data": {"value": 60}}
        )
        async_to_sync(consumer.disconnect)(1000)

    def test_glycemia_middleware(self):
        token = AccessToken.for_user(self.user)
        user = async_to_sync(get_user_from_token)(str(token))
        self.assertEqual(user.id_auth, self.user.id_auth)

        anon = async_to_sync(get_user_from_token)(None)
        self.assertTrue(isinstance(anon, AnonymousUser))

        invalid = async_to_sync(get_user_from_token)("bad.token")
        self.assertTrue(isinstance(invalid, AnonymousUser))

        with override_settings(SECRET_KEY_ADMIN="admin-secret"):
            payload = {
                settings.SIMPLE_JWT.get("USER_ID_CLAIM", "user_id"): str(self.user.id_auth)
            }
            token_str = jwt.encode(payload, "admin-secret", algorithm="HS256")
            user = async_to_sync(get_user_from_token)(token_str)
            self.assertEqual(user.id_auth, self.user.id_auth)

        with override_settings(SECRET_KEY_ADMIN="admin-secret"):
            invalid_admin = async_to_sync(get_user_from_token)("bad.admin.token")
            self.assertTrue(isinstance(invalid_admin, AnonymousUser))

        with patch("apps.glycemia.middleware.AccessToken", side_effect=Exception("boom")):
            anon = async_to_sync(get_user_from_token)("token")
            self.assertTrue(isinstance(anon, AnonymousUser))

        app = AsyncMock()
        middleware = JWTAuthMiddleware(app)
        scope = {"query_string": f"token={str(token)}".encode("utf-8")}
        async_to_sync(middleware)(scope, AsyncMock(), AsyncMock())
        self.assertTrue(scope["user"].is_authenticated)

    def test_glycemia_routing(self):
        from apps.glycemia.routing import websocket_urlpatterns

        self.assertEqual(len(websocket_urlpatterns), 1)
