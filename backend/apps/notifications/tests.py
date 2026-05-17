from unittest.mock import MagicMock, patch

import pytest
import requests
from django.contrib.auth import get_user_model

from rest_framework.test import APIClient

from apps.notifications.models import DeviceType, Notification, PushToken, UserNotification
from apps.notifications.serializers import PushTokenSerializer
from apps.notifications.services.push import (
    _build_messages,
    _process_ticket_errors,
    send_push_notification,
    send_push_to_user,
)

User = get_user_model()

# ─── Fixtures ────────────────────────────────────────────────────

VALID_TOKEN = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
VALID_TOKEN_2 = "ExponentPushToken[yyyyyyyyyyyyyyyyyyyyyy]"


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="notif_test@example.com", password="pass1234"
    )  # NOSONAR


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="notif_other@example.com", password="pass1234"
    )  # NOSONAR


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def notification(db):
    return Notification.objects.create(name="Hyperglycemia Alert", type="alert")


# ═══════════════════════════════════════════════════════════════════
# 1. MODÈLES
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestNotificationModel:
    def test_notification_creation(self, notification):
        assert notification.name == "Hyperglycemia Alert"
        assert notification.type == "alert"

    def test_notification_optional_description(self, db):
        n = Notification.objects.create(name="Reminder")
        assert n.description is None


@pytest.mark.django_db
class TestUserNotificationModel:
    def test_user_notification_creation(self, user, notification):
        un = UserNotification.objects.create(user=user, notification=notification)
        assert un.statut is False
        assert un.sent_at is None

    def test_unique_together_user_notification(self, user, notification):
        from django.db import IntegrityError
        UserNotification.objects.create(user=user, notification=notification)
        with pytest.raises(IntegrityError):
            UserNotification.objects.create(user=user, notification=notification)


@pytest.mark.django_db
class TestPushTokenModel:
    def test_push_token_str(self, user):
        token = PushToken.objects.create(
            user=user,
            token=VALID_TOKEN,
            device_type="android",
        )
        assert user.email in str(token)
        assert "android" in str(token)

    def test_push_token_default_device_type(self, user):
        token = PushToken.objects.create(user=user, token=VALID_TOKEN)
        assert token.device_type == "android"

    def test_push_token_is_active_by_default(self, user):
        token = PushToken.objects.create(user=user, token=VALID_TOKEN)
        assert token.is_active is True


# ═══════════════════════════════════════════════════════════════════
# 2. API PUSH TOKEN
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestPushTokenRegister:
    def test_register_valid_token(self, client):
        resp = client.post("/api/notifications/push-token/", {
            "token": VALID_TOKEN,
            "device_type": "ios",
        }, format="json")
        assert resp.status_code == 201
        assert resp.json()["token"] == VALID_TOKEN

    def test_register_invalid_token_format_rejected(self, client):
        resp = client.post("/api/notifications/push-token/", {
            "token": "invalid-token-format",
            "device_type": "android",
        }, format="json")
        assert resp.status_code == 400
        assert "error" in resp.json()

    def test_register_token_idempotent(self, client):
        client.post("/api/notifications/push-token/", {
            "token": VALID_TOKEN,
            "device_type": "android",
        }, format="json")
        resp = client.post("/api/notifications/push-token/", {
            "token": VALID_TOKEN,
            "device_type": "ios",
        }, format="json")
        assert resp.status_code == 201
        assert PushToken.objects.filter(token=VALID_TOKEN).count() == 1
        assert PushToken.objects.get(token=VALID_TOKEN).device_type == "ios"


@pytest.mark.django_db
class TestPushTokenList:
    def test_list_own_tokens(self, client, user):
        PushToken.objects.create(user=user, token=VALID_TOKEN)
        PushToken.objects.create(user=user, token=VALID_TOKEN_2)
        resp = client.get("/api/notifications/push-token/")
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    def test_inactive_tokens_not_returned(self, client, user):
        PushToken.objects.create(user=user, token=VALID_TOKEN, is_active=False)
        resp = client.get("/api/notifications/push-token/")
        assert resp.status_code == 200
        assert len(resp.json()) == 0

    def test_other_user_tokens_not_returned(self, client, other_user):
        PushToken.objects.create(user=other_user, token=VALID_TOKEN)
        resp = client.get("/api/notifications/push-token/")
        assert resp.status_code == 200
        assert len(resp.json()) == 0


@pytest.mark.django_db
class TestPushTokenDelete:
    def test_delete_token(self, client, user):
        PushToken.objects.create(user=user, token=VALID_TOKEN)
        resp = client.delete("/api/notifications/push-token/", {"token": VALID_TOKEN}, format="json")
        assert resp.status_code == 204
        assert not PushToken.objects.filter(token=VALID_TOKEN).exists()

    def test_delete_token_not_found(self, client):
        resp = client.delete("/api/notifications/push-token/", {
            "token": VALID_TOKEN,
        }, format="json")
        assert resp.status_code == 404

    def test_delete_without_token_body_rejected(self, client):
        resp = client.delete("/api/notifications/push-token/", {}, format="json")
        assert resp.status_code == 400

    def test_cannot_delete_other_user_token(self, client, other_user):
        PushToken.objects.create(user=other_user, token=VALID_TOKEN)
        resp = client.delete("/api/notifications/push-token/", {"token": VALID_TOKEN}, format="json")
        assert resp.status_code == 404
        assert PushToken.objects.filter(token=VALID_TOKEN).exists()


def test_build_messages_includes_payload_when_data_is_present():
    messages = _build_messages(
        ["ExponentPushToken[a]", "ExponentPushToken[b]"],
        "Alerte",
        "Glycemie haute",
        {"kind": "hyper"},
        "default",
        "high",
    )

    assert messages == [
        {
            "to": "ExponentPushToken[a]",
            "title": "Alerte",
            "body": "Glycemie haute",
            "sound": "default",
            "priority": "high",
            "channelId": "glycemia-alerts",
            "data": {"kind": "hyper"},
        },
        {
            "to": "ExponentPushToken[b]",
            "title": "Alerte",
            "body": "Glycemie haute",
            "sound": "default",
            "priority": "high",
            "channelId": "glycemia-alerts",
            "data": {"kind": "hyper"},
        },
    ]


def test_build_messages_omits_empty_data():
    [message] = _build_messages(["token"], "Title", "Body", None, "default", "normal")

    assert "data" not in message
    assert message["priority"] == "normal"


@pytest.mark.django_db
def test_process_ticket_errors_deactivates_unregistered_token():
    user = User.objects.create_user(email="push@example.com", password="pass1234")
    PushToken.objects.create(
        user=user,
        token="ExponentPushToken[dead]",
        device_type=DeviceType.ANDROID,
    )

    errors = _process_ticket_errors(
        ["ExponentPushToken[dead]"],
        [
            {
                "status": "error",
                "message": "Device not registered",
                "details": {"error": "DeviceNotRegistered"},
            }
        ],
    )

    assert errors == [
        {"token": "ExponentPushToken[dead]", "error": "Device not registered"}
    ]
    assert PushToken.objects.get(token="ExponentPushToken[dead]").is_active is False


def test_process_ticket_errors_handles_unknown_token_index():
    errors = _process_ticket_errors([], [{"status": "error", "message": "Boom"}])

    assert errors == [{"token": "unknown", "error": "Boom"}]


def test_send_push_notification_returns_error_without_tokens():
    result = send_push_notification([], "Title", "Body")

    assert result == {"success": False, "error": "No tokens provided"}


@patch("apps.notifications.services.push.requests.post")
def test_send_push_notification_success(mock_post):
    response = MagicMock()
    response.json.return_value = {"data": [{"status": "ok"}]}
    response.raise_for_status.return_value = None
    mock_post.return_value = response

    result = send_push_notification(["ExponentPushToken[ok]"], "Title", "Body")

    assert result == {"success": True, "sent": 1}
    mock_post.assert_called_once()
    assert mock_post.call_args.kwargs["json"][0]["to"] == "ExponentPushToken[ok]"


@patch("apps.notifications.services.push.requests.post")
def test_send_push_notification_reports_ticket_errors(mock_post):
    response = MagicMock()
    response.json.return_value = {
        "data": [{"status": "error", "message": "Invalid credentials"}]
    }
    response.raise_for_status.return_value = None
    mock_post.return_value = response

    result = send_push_notification(["ExponentPushToken[bad]"], "Title", "Body")

    assert result == {
        "success": True,
        "errors": [
            {"token": "ExponentPushToken[bad]", "error": "Invalid credentials"}
        ],
        "sent": 0,
    }


@patch("apps.notifications.services.push.requests.post")
def test_send_push_notification_handles_request_exception(mock_post):
    mock_post.side_effect = requests.exceptions.Timeout("slow")

    result = send_push_notification(["ExponentPushToken[slow]"], "Title", "Body")

    assert result["success"] is False
    assert "slow" in result["error"]


@pytest.mark.django_db
def test_send_push_to_user_returns_error_when_no_active_tokens():
    user = User.objects.create_user(email="no-token@example.com", password="pass1234")

    result = send_push_to_user(user, "Title", "Body")

    assert result == {"success": False, "error": "No active tokens for user"}


@pytest.mark.django_db
@patch("apps.notifications.services.push.send_push_notification")
def test_send_push_to_user_sends_only_active_tokens(mock_send):
    user = User.objects.create_user(email="active-token@example.com", password="pass1234")
    PushToken.objects.create(user=user, token="active", is_active=True)
    PushToken.objects.create(user=user, token="inactive", is_active=False)
    mock_send.return_value = {"success": True, "sent": 1}

    result = send_push_to_user(user, "Title", "Body", {"kind": "test"})

    assert result == {"success": True, "sent": 1}
    mock_send.assert_called_once_with(["active"], "Title", "Body", {"kind": "test"})


def test_push_token_serializer_rejects_invalid_token():
    serializer = PushTokenSerializer(data={"token": "bad-token"})

    assert serializer.is_valid() is False
    assert "token" in serializer.errors


@pytest.mark.django_db
def test_push_token_serializer_creates_and_reactivates_token():
    user = User.objects.create_user(email="serializer@example.com", password="pass1234")
    request = MagicMock(user=user)
    serializer = PushTokenSerializer(
        data={"token": "ExponentPushToken[serializer]", "device_type": DeviceType.IOS},
        context={"request": request},
    )

    assert serializer.is_valid(), serializer.errors
    token = serializer.save()

    assert token.user == user
    assert token.device_type == DeviceType.IOS
    assert token.is_active is True

    token.is_active = False
    token.save()
    serializer = PushTokenSerializer(
        data={"token": "ExponentPushToken[serializer]"},
        context={"request": request},
    )
    assert serializer.is_valid(), serializer.errors
    updated = serializer.save()

    assert updated.pk == token.pk
    assert updated.is_active is True
