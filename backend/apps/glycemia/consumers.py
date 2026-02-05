"""
WebSocket consumer for real-time glycemia updates.

Handles:
- User connection/disconnection
- Adding users to their personal channel group
- Broadcasting glycemia updates and alerts
- Ping/pong for connection health checks
"""

import json
import logging

from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class GlycemiaConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time glycemia data streaming.

    Each authenticated user joins their own group: glycemia_user_{user_id}
    Messages are broadcast to users when new glycemia readings are recorded.
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope.get("user")

        # Reject anonymous users
        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            logger.warning("WebSocket connection rejected: unauthenticated user")
            await self.close(code=4001)
            return

        # Create user-specific group name
        self.group_name = f"glycemia_user_{self.user.id_auth}"

        # Join the user's personal group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": "Connected to glycemia WebSocket",
            "user_id": str(self.user.id_auth),
        }))

        logger.info(f"WebSocket connected: user {self.user.id_auth}")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
            logger.info(f"WebSocket disconnected: user {self.user.id_auth}, code {close_code}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get("type", "")

            # Handle ping/pong for connection health
            if message_type == "ping":
                await self.send(text_data=json.dumps({
                    "type": "pong",
                }))
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received: {text_data[:100]}")

    async def glycemia_update(self, event):
        """
        Handle glycemia_update message from channel layer.
        Sent when a new glycemia reading is recorded.
        """
        await self.send(text_data=json.dumps({
            "type": "glycemia_update",
            "data": event["data"],
        }))

    async def glycemia_alert(self, event):
        """
        Handle glycemia_alert message from channel layer.
        Sent when glycemia value is outside normal range (hypo/hyper).
        """
        await self.send(text_data=json.dumps({
            "type": "glycemia_alert",
            "alert_type": event["alert_type"],
            "data": event["data"],
        }))
