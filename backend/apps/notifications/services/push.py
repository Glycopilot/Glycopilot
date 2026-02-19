"""
Push notification service using Expo Push API.

Expo Push API is free and handles both iOS and Android.
Documentation: https://docs.expo.dev/push-notifications/sending-notifications/
"""

import logging
from typing import Any

import requests

from apps.notifications.models import PushToken

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def _build_messages(
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, Any] | None,
    sound: str,
    priority: str,
) -> list[dict]:
    messages = []
    for token in tokens:
        message = {
            "to": token,
            "title": title,
            "body": body,
            "sound": sound,
            "priority": priority,
        }
        if data:
            message["data"] = data
        messages.append(message)
    return messages


def _process_ticket_errors(tokens: list[str], tickets: list[dict]) -> list[dict]:
    errors = []
    for i, ticket in enumerate(tickets):
        if ticket.get("status") != "error":
            continue
        errors.append({
            "token": tokens[i] if i < len(tokens) else "unknown",
            "error": ticket.get("message", "Unknown error"),
        })
        if ticket.get("details", {}).get("error") == "DeviceNotRegistered":
            PushToken.objects.filter(token=tokens[i]).update(is_active=False)
            logger.info(f"Deactivated invalid token: {tokens[i][:20]}...")
    return errors


def send_push_notification(
    tokens: list[str],
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
    sound: str = "default",
    priority: str = "high",
) -> dict:
    """
    Send push notification to multiple Expo push tokens.

    Args:
        tokens: List of Expo push tokens
        title: Notification title
        body: Notification body/message
        data: Optional data payload (accessible in app)
        sound: Notification sound ("default" or None)
        priority: "default", "normal", or "high"

    Returns:
        dict with success status and details
    """
    if not tokens:
        logger.warning("No push tokens provided")
        return {"success": False, "error": "No tokens provided"}

    messages = _build_messages(tokens, title, body, data, sound, priority)

    try:
        response = requests.post(
            EXPO_PUSH_URL,
            json=messages,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=10,
        )
        response.raise_for_status()
        result = response.json()

        errors = _process_ticket_errors(tokens, result.get("data", []))

        if errors:
            logger.warning(f"Push notification errors: {errors}")
            return {"success": True, "errors": errors, "sent": len(tokens) - len(errors)}

        logger.info(f"Push notifications sent successfully to {len(tokens)} devices")
        return {"success": True, "sent": len(tokens)}

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send push notification: {e}")
        return {"success": False, "error": str(e)}


def send_push_to_user(
    user,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> dict:
    """
    Send push notification to all active devices of a user.

    Args:
        user: User instance (AuthAccount)
        title: Notification title
        body: Notification body/message
        data: Optional data payload

    Returns:
        dict with success status and details
    """
    tokens = list(
        PushToken.objects.filter(user=user, is_active=True).values_list("token", flat=True)
    )

    if not tokens:
        logger.info(f"No active push tokens for user {user.email}")
        return {"success": False, "error": "No active tokens for user"}

    return send_push_notification(tokens, title, body, data)
