import importlib
import os

from asgiref.sync import async_to_sync
from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.exceptions import NotAuthenticated, PermissionDenied

from apps.profiles.models import Profile, Role
from apps.users.models import AuthAccount, User
from utils.permissions import allowed_roles


class CoverageSmokeTests(TestCase):
    def test_manage_main_calls_execute(self):
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if base_dir in importlib.sys.path:
            importlib.sys.path.remove(base_dir)
        manage_path = os.path.join(base_dir, "manage.py")
        spec = importlib.util.spec_from_file_location("manage_temp", manage_path)
        manage = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(manage)
        calls = []

        def fake_execute(argv):
            calls.append(argv)

        import django.core.management

        original = django.core.management.execute_from_command_line
        django.core.management.execute_from_command_line = fake_execute
        try:
            manage.main()
        finally:
            django.core.management.execute_from_command_line = original

        self.assertTrue(calls)

    def test_manage_main_as_script(self):
        import runpy
        import sys

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if base_dir in sys.path:
            sys.path.remove(base_dir)

        calls = []

        def fake_execute(argv):
            calls.append(argv)

        import django.core.management

        original = django.core.management.execute_from_command_line
        django.core.management.execute_from_command_line = fake_execute
        try:
            runpy.run_module("manage", run_name="__main__")
        finally:
            django.core.management.execute_from_command_line = original

        self.assertTrue(calls)

    def test_wsgi_application_import(self):
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
        wsgi = importlib.import_module("core.wsgi")
        self.assertTrue(callable(wsgi.application))

    @override_settings(DEBUG=True)
    def test_asgi_application_debug(self):
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
        asgi = importlib.reload(importlib.import_module("core.asgi"))
        self.assertTrue(callable(asgi.application))

    @override_settings(DEBUG=False)
    def test_asgi_application_production(self):
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
        asgi = importlib.reload(importlib.import_module("core.asgi"))
        self.assertTrue(callable(asgi.application))

    def test_placeholder_urls(self):
        from apps.notifications import urls as notif_urls
        from apps.profiles import urls as profile_urls

        self.assertEqual(notif_urls.urlpatterns, [])
        self.assertEqual(profile_urls.urlpatterns, [])

    def test_profile_serializer(self):
        role, _ = Role.objects.get_or_create(name="PATIENT")
        identity = User.objects.create(first_name="Jean", last_name="Dupont")
        profile = Profile.objects.create(user=identity, role=role)
        from apps.profiles.serializers import ProfileSerializer

        from django.core.exceptions import ImproperlyConfigured

        with self.assertRaises(ImproperlyConfigured):
            ProfileSerializer(profile).data

    def test_allowed_roles_decorator(self):
        @allowed_roles(["patient"])
        def view(request):
            return "ok"

        class DummyUser:
            is_authenticated = True
            role = "patient"

        class DummyRequest:
            user = DummyUser()

        self.assertEqual(view(DummyRequest()), "ok")

        class BadUser:
            is_authenticated = True
            role = "doctor"

        class BadRequest:
            user = BadUser()

        with self.assertRaises(PermissionDenied):
            view(BadRequest())

        class NoAuthUser:
            is_authenticated = False

        class NoAuthRequest:
            user = NoAuthUser()

        with self.assertRaises(NotAuthenticated):
            view(NoAuthRequest())

    def test_users_serializers(self):
        patient_role, _ = Role.objects.get_or_create(name="PATIENT")
        identity = User.objects.create(first_name="Pat", last_name="User")
        Profile.objects.create(user=identity, role=patient_role)
        from apps.users.serializers import UserSerializer

        data = UserSerializer(identity).data
        self.assertEqual(data["first_name"], "Pat")

    def test_users_signals_no_rules(self):
        from apps.users.signals import create_default_alert_rules
        # No active rules should not raise
        user = AuthAccount.objects.create_user(email="sig@test.com", password="x")
        create_default_alert_rules(sender=None, instance=user, created=True)

        from apps.alerts.models import AlertRule

        AlertRule.objects.create(
            code="HYPO",
            name="Hypo",
            min_glycemia=70,
            severity=1,
            is_active=True,
        )
        create_default_alert_rules(sender=None, instance=user, created=True)

        from unittest.mock import patch

        with patch(
            "apps.alerts.models.AlertRule.objects.filter", side_effect=Exception("boom")
        ):
            create_default_alert_rules(sender=None, instance=user, created=True)
