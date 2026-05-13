from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.notifications.models import PushToken
from apps.notifications.serializers import PushTokenSerializer

User = get_user_model()


class PushTokenSerializerTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="serializer-notif@test.com",
            password="pass123",
        )
        self.request = type("Req", (), {"user": self.user})()

    def test_validate_token_rejects_non_expo_format(self):
        serializer = PushTokenSerializer(
            data={"token": "abc", "device_type": "android"},
            context={"request": self.request},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("token", serializer.errors)

    def test_create_creates_new_token(self):
        serializer = PushTokenSerializer(
            data={"token": "ExponentPushToken[new-one]", "device_type": "ios"},
            context={"request": self.request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()

        self.assertEqual(instance.user, self.user)
        self.assertEqual(instance.device_type, "ios")
        self.assertTrue(instance.is_active)

    def test_create_updates_existing_token_and_reactivates(self):
        PushToken.objects.create(
            user=self.user,
            token="ExponentPushToken[existing]",
            device_type="android",
            is_active=False,
        )

        serializer = PushTokenSerializer(
            data={"token": "ExponentPushToken[existing]", "device_type": "ios"},
            context={"request": self.request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()

        self.assertEqual(
            PushToken.objects.filter(token="ExponentPushToken[existing]").count(), 1
        )
        self.assertEqual(instance.device_type, "ios")
        self.assertTrue(instance.is_active)
