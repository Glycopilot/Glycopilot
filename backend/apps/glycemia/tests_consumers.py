import json

from django.contrib.auth import get_user_model

import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator

from core.asgi import application

User = get_user_model()


@pytest.fixture(autouse=True)
def use_in_memory_channel_layer(settings):
    settings.CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_glycemia_consumer_connect_success():
    """Test successful WebSocket connection."""
    user = await sync_to_async(User.objects.create_user)(
        email="ws_test@test.com", password="password"
    )
    from rest_framework_simplejwt.tokens import AccessToken

    token = str(AccessToken.for_user(user))

    communicator = WebsocketCommunicator(application, f"/ws/glycemia/?token={token}")
    connected, subprotocol = await communicator.connect()
    assert connected

    response = await communicator.receive_from()
    data = json.loads(response)
    assert data["type"] == "connection_established"
    assert data["user_id"] == str(user.id_auth)

    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_glycemia_consumer_connect_anonymous():
    """Test connection rejection for anonymous user."""
    communicator = WebsocketCommunicator(application, "/ws/glycemia/")
    connected, subprotocol = await communicator.connect()
    assert not connected
    assert subprotocol == 4001


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_glycemia_consumer_ping_pong():
    """Test ping/pong functionality."""
    user = await sync_to_async(User.objects.create_user)(
        email="ping@test.com", password="password"
    )
    from rest_framework_simplejwt.tokens import AccessToken

    token = str(AccessToken.for_user(user))

    communicator = WebsocketCommunicator(application, f"/ws/glycemia/?token={token}")
    await communicator.connect()
    await communicator.receive_from()

    await communicator.send_to(text_data=json.dumps({"type": "ping"}))
    response = await communicator.receive_from()
    data = json.loads(response)
    assert data["type"] == "pong"

    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_glycemia_consumer_broadcasts():
    """Test handling of messages from channel layer."""
    user = await sync_to_async(User.objects.create_user)(
        email="broadcast@test.com", password="password"
    )
    from rest_framework_simplejwt.tokens import AccessToken

    token = str(AccessToken.for_user(user))

    communicator = WebsocketCommunicator(application, f"/ws/glycemia/?token={token}")
    await communicator.connect()
    await communicator.receive_from()  # consume connection message

    import asyncio

    await asyncio.sleep(0.1)  # Wait for group join

    # Simulate a glycemia_update event sent via channel layer
    event_data = {"value": 120, "measured_at": "2023-01-01T12:00:00Z"}
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()
    group_name = f"glycemia_user_{user.id_auth}"

    await channel_layer.group_send(
        group_name, {"type": "glycemia_update", "data": event_data}
    )

    response = await communicator.receive_from(timeout=5)
    data = json.loads(response)
    assert data["type"] == "glycemia_update"
    assert data["data"] == event_data

    await channel_layer.group_send(
        group_name, {"type": "glycemia_alert", "alert_type": "hypo", "data": event_data}
    )

    response = await communicator.receive_from()
    data = json.loads(response)
    assert data["type"] == "glycemia_alert"
    assert data["alert_type"] == "hypo"

    await communicator.disconnect()


def test_routing_import():
    """Simple test to ensure routing.py is valid and imported."""
    from apps.glycemia import routing

    assert hasattr(routing, "websocket_urlpatterns")
    assert len(routing.websocket_urlpatterns) > 0
