from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model

import pytest
import requests

from apps.notifications.models import PushToken
from apps.notifications.services.push import (
    _build_messages,
    _process_ticket_errors,
    send_push_notification,
    send_push_to_user,
)

User = get_user_model()


def _mk_user(email="notif@test.com"):
    return User.objects.create_user(email=email, password="pass123")


def test_build_messages_contains_expected_fields_and_data():
    tokens = ["ExponentPushToken[a]", "ExponentPushToken[b]"]
    messages = _build_messages(
        tokens=tokens,
        title="Alert",
        body="Body",
        data={"event_id": 1},
        sound="default",
        priority="high",
    )

    assert len(messages) == 2
    assert messages[0]["to"] == tokens[0]
    assert messages[0]["title"] == "Alert"
    assert messages[0]["data"] == {"event_id": 1}
    assert messages[1]["to"] == tokens[1]


@pytest.mark.django_db
def test_process_ticket_errors_returns_errors_and_deactivates_invalid_token():
    user = _mk_user()
    bad_token = "ExponentPushToken[bad]"
    PushToken.objects.create(user=user, token=bad_token, is_active=True)

    errors = _process_ticket_errors(
        tokens=[bad_token],
        tickets=[
            {
                "status": "error",
                "message": "Device not registered",
                "details": {"error": "DeviceNotRegistered"},
            }
        ],
    )

    assert len(errors) == 1
    assert errors[0]["token"] == bad_token
    assert errors[0]["error"] == "Device not registered"
    assert PushToken.objects.get(token=bad_token).is_active is False


def test_send_push_notification_returns_failure_when_no_tokens():
    result = send_push_notification(tokens=[], title="A", body="B")
    assert result == {"success": False, "error": "No tokens provided"}


@patch("apps.notifications.services.push.requests.post")
def test_send_push_notification_success_without_errors(mock_post):
    response = MagicMock()
    response.json.return_value = {"data": [{"status": "ok"}]}
    response.raise_for_status.return_value = None
    mock_post.return_value = response

    result = send_push_notification(
        tokens=["ExponentPushToken[ok]"],
        title="Title",
        body="Body",
    )

    assert result["success"] is True
    assert result["sent"] == 1


@patch("apps.notifications.services.push.requests.post")
def test_send_push_notification_success_with_partial_errors(mock_post):
    response = MagicMock()
    response.json.return_value = {
        "data": [
            {"status": "ok"},
            {"status": "error", "message": "Bad token", "details": {}},
        ]
    }
    response.raise_for_status.return_value = None
    mock_post.return_value = response

    result = send_push_notification(
        tokens=["ExponentPushToken[ok]", "ExponentPushToken[bad]"],
        title="Title",
        body="Body",
    )

    assert result["success"] is True
    assert result["sent"] == 1
    assert len(result["errors"]) == 1


@patch("apps.notifications.services.push.requests.post")
def test_send_push_notification_handles_request_exception(mock_post):
    mock_post.side_effect = requests.exceptions.RequestException("timeout")

    result = send_push_notification(
        tokens=["ExponentPushToken[ok]"],
        title="Title",
        body="Body",
    )

    assert result["success"] is False
    assert "timeout" in result["error"]


@pytest.mark.django_db
@patch("apps.notifications.services.push.send_push_notification")
def test_send_push_to_user_uses_active_tokens_only(mock_send_push):
    user = _mk_user("active@test.com")
    PushToken.objects.create(user=user, token="ExponentPushToken[1]", is_active=True)
    PushToken.objects.create(user=user, token="ExponentPushToken[2]", is_active=False)
    mock_send_push.return_value = {"success": True, "sent": 1}

    result = send_push_to_user(user=user, title="A", body="B", data={"x": 1})

    assert result["success"] is True
    mock_send_push.assert_called_once()
    tokens_arg = mock_send_push.call_args.args[0]
    assert tokens_arg == ["ExponentPushToken[1]"]


@pytest.mark.django_db
def test_send_push_to_user_returns_failure_without_active_tokens():
    user = _mk_user("none@test.com")
    PushToken.objects.create(user=user, token="ExponentPushToken[inactive]", is_active=False)

    result = send_push_to_user(user=user, title="A", body="B")

    assert result["success"] is False
    assert result["error"] == "No active tokens for user"
