"""
Push notification service for alerts.
Uses Expo Push API via the notifications module.
"""

import logging

from apps.notifications.services import send_push_to_user

logger = logging.getLogger(__name__)


class PushSendError(Exception):
    """Raised when push notification fails to send."""

    pass


def send_push(*, user, title: str, body: str, data: dict | None = None) -> None:
    """
    Send push notification to user for an alert.

    Args:
        user: User instance (AuthAccount)
        title: Alert title (e.g., "Hypoglycémie")
        body: Alert message (e.g., "Glycémie: 65 mg/dL")
        data: Optional data payload

    Raises:
        PushSendError: If push notification fails
    """
    result = send_push_to_user(user, title, body, data)

    if not result.get("success"):
        error = result.get("error", "Unknown error")
        # Don't raise if user simply has no tokens registered
        if "No active tokens" in error:
            logger.info(f"User {user.email} has no push tokens, skipping push")
            return
        raise PushSendError(error)

    logger.info(f"Push notification sent to {user.email}: {title}")
