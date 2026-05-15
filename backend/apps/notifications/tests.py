import pytest
from django.contrib.auth import get_user_model

from rest_framework.test import APIClient

from apps.notifications.models import Notification, PushToken, UserNotification

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
