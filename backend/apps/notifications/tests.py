from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import PushToken

User = get_user_model()


class PushTokenViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="notif-user@test.com",
            password="pass123",
        )
        self.client.force_authenticate(user=self.user)
        self.url = reverse("push-token")

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_returns_only_active_tokens_for_current_user(self):
        PushToken.objects.create(
            user=self.user,
            token="ExponentPushToken[active]",
            device_type="android",
            is_active=True,
        )
        PushToken.objects.create(
            user=self.user,
            token="ExponentPushToken[inactive]",
            device_type="android",
            is_active=False,
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["token"], "ExponentPushToken[active]")

    def test_post_creates_token(self):
        payload = {
            "token": "ExponentPushToken[new-token]",
            "device_type": "ios",
        }

        response = self.client.post(self.url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            PushToken.objects.filter(token="ExponentPushToken[new-token]").exists()
        )

    def test_post_rejects_invalid_token_format(self):
        response = self.client.post(
            self.url,
            {"token": "invalid-token", "device_type": "android"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("token", response.data)

    def test_delete_returns_400_when_token_missing(self):
        response = self.client.delete(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Token is required")

    def test_delete_returns_404_when_token_not_found(self):
        response = self.client.delete(
            self.url,
            {"token": "ExponentPushToken[missing]"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["error"], "Token not found")

    def test_delete_returns_204_when_token_exists(self):
        PushToken.objects.create(
            user=self.user,
            token="ExponentPushToken[delete-me]",
            device_type="android",
            is_active=True,
        )

        response = self.client.delete(
            self.url,
            {"token": "ExponentPushToken[delete-me]"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            PushToken.objects.filter(token="ExponentPushToken[delete-me]").exists()
        )

    def test_post_same_token_twice_keeps_single_record(self):
        payload = {
            "token": "ExponentPushToken[dedupe]",
            "device_type": "android",
        }

        first = self.client.post(self.url, payload, format="json")
        second = self.client.post(self.url, payload, format="json")

        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            PushToken.objects.filter(token="ExponentPushToken[dedupe]").count(), 1
        )
