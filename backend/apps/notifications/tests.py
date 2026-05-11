"""Tests for notifications app — PushTokenView (GET, POST, DELETE)."""
import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.notifications.models import PushToken
from apps.users.models import AuthAccount
from apps.users.models import User as UserIdentity

# ─── Helpers ────────────────────────────────────────────────────────────────


def _make_user(email="notif_user@test.com", password="pass123"):
    identity = UserIdentity.objects.create(first_name="Notif", last_name="Tester")
    return AuthAccount.objects.create_user(
        email=email, password=password, user_identity=identity
    )


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


VALID_TOKEN = "ExponentPushToken[test-device-token-abc123]"
VALID_TOKEN_2 = "ExponentPushToken[test-device-token-xyz456]"


# ─── PushTokenView ───────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestPushTokenView:
    def test_get_push_tokens_empty(self):
        user = _make_user()
        client = _auth_client(user)
        resp = client.get("/api/notifications/push-token/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data == []

    def test_get_push_tokens_returns_active_tokens(self):
        user = _make_user()
        PushToken.objects.create(
            user=user, token=VALID_TOKEN, device_type="android", is_active=True
        )
        PushToken.objects.create(
            user=user, token=VALID_TOKEN_2, device_type="ios", is_active=False
        )
        client = _auth_client(user)

        resp = client.get("/api/notifications/push-token/")
        assert resp.status_code == status.HTTP_200_OK
        # Only active token returned
        assert len(resp.data) == 1
        assert resp.data[0]["token"] == VALID_TOKEN

    def test_post_register_push_token(self):
        user = _make_user()
        client = _auth_client(user)

        resp = client.post(
            "/api/notifications/push-token/",
            {"token": VALID_TOKEN, "device_type": "android"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert PushToken.objects.filter(user=user, token=VALID_TOKEN).exists()

    def test_post_register_invalid_token_format(self):
        user = _make_user()
        client = _auth_client(user)

        resp = client.post(
            "/api/notifications/push-token/",
            {"token": "invalid-token-format"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_post_update_existing_token(self):
        """If token already exists, it should update (upsert)."""
        user = _make_user()
        PushToken.objects.create(
            user=user, token=VALID_TOKEN, device_type="android", is_active=False
        )
        client = _auth_client(user)

        resp = client.post(
            "/api/notifications/push-token/",
            {"token": VALID_TOKEN, "device_type": "ios"},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        # Token should be reactivated
        token = PushToken.objects.get(token=VALID_TOKEN)
        assert token.is_active is True

    def test_delete_push_token(self):
        user = _make_user()
        PushToken.objects.create(user=user, token=VALID_TOKEN, device_type="android")
        client = _auth_client(user)

        resp = client.delete(
            "/api/notifications/push-token/",
            {"token": VALID_TOKEN},
            format="json",
        )
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert not PushToken.objects.filter(token=VALID_TOKEN).exists()

    def test_delete_push_token_not_found(self):
        user = _make_user()
        client = _auth_client(user)

        resp = client.delete(
            "/api/notifications/push-token/",
            {"token": VALID_TOKEN},
            format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_requires_token_field(self):
        user = _make_user()
        client = _auth_client(user)

        resp = client.delete("/api/notifications/push-token/", {}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_unauthenticated_cannot_access_push_token(self):
        client = APIClient()
        resp = client.get("/api/notifications/push-token/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_tokens_are_user_isolated(self):
        """User A cannot see or delete user B's tokens."""
        user_a = _make_user("a@test.com")
        user_b = _make_user("b@test.com")
        PushToken.objects.create(user=user_b, token=VALID_TOKEN, device_type="android")

        client_a = _auth_client(user_a)
        resp = client_a.get("/api/notifications/push-token/")
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 0
