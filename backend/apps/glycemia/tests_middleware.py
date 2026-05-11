from django.contrib.auth import get_user_model

import pytest
from asgiref.sync import sync_to_async
from rest_framework_simplejwt.tokens import AccessToken

from apps.glycemia.middleware import JWTAuthMiddleware, get_user_from_token

User = get_user_model()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_jwt_auth_middleware_no_token():
    """Test middleware when no token is provided."""

    async def inner(scope, receive, send):
        await send({"type": "websocket.accept"})

    middleware = JWTAuthMiddleware(inner)

    scope = {"type": "websocket", "query_string": b""}

    # Mock send to capture the close message
    results = []

    async def send(message):
        results.append(message)

    await middleware(scope, None, send)

    assert len(results) == 1
    assert results[0]["type"] == "websocket.close"
    assert results[0]["code"] == 4001


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_jwt_auth_middleware_valid_token():
    """Test middleware with a valid token."""
    user = await sync_to_async(User.objects.create_user)(
        email="ws_user@test.com", password="password"
    )
    token = str(AccessToken.for_user(user))

    async def inner(scope, receive, send):
        await send({"type": "websocket.accept"})

    middleware = JWTAuthMiddleware(inner)

    scope = {"type": "websocket", "query_string": f"token={token}".encode()}

    # Mock send
    results = []

    async def send(message):
        results.append(message)

    await middleware(scope, None, send)

    assert scope["user"] == user
    assert len(results) == 1
    assert results[0]["type"] == "websocket.accept"


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_jwt_auth_middleware_invalid_token():
    """Test middleware with an invalid token."""

    async def inner(scope, receive, send):
        await send({"type": "websocket.accept"})

    middleware = JWTAuthMiddleware(inner)

    scope = {"type": "websocket", "query_string": b"token=invalid_token"}

    results = []

    async def send(message):
        results.append(message)

    await middleware(scope, None, send)

    assert results[0]["type"] == "websocket.close"
    assert results[0]["code"] == 4001


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_jwt_auth_middleware_admin_key(settings):
    """Test middleware with SECRET_KEY_ADMIN."""
    settings.SECRET_KEY_ADMIN = "admin_secret_key_123"
    user = await sync_to_async(User.objects.create_user)(
        email="admin_ws@test.com", password="password"
    )

    # Generate token manually using admin key
    import jwt

    payload = {"user_id": str(user.id_auth), "exp": 9999999999}
    token = jwt.encode(payload, settings.SECRET_KEY_ADMIN, algorithm="HS256")

    async def inner(scope, receive, send):
        await send({"type": "websocket.accept"})

    middleware = JWTAuthMiddleware(inner)
    scope = {"type": "websocket", "query_string": f"token={token}".encode()}

    results = []

    async def send(message):
        results.append(message)

    await middleware(scope, None, send)

    assert scope["user"] == user
    assert results[0]["type"] == "websocket.accept"


@pytest.mark.django_db(transaction=True)
def test_get_user_from_token_empty():
    """Test helper with empty token."""
    import asyncio

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def run():
        return await get_user_from_token("")

    result = loop.run_until_complete(run())
    assert result is None
    loop.close()


def test_apps_config():
    """Test that apps config is valid."""
    from apps.glycemia.apps import GlycemiaConfig
    assert GlycemiaConfig.name == "apps.glycemia"
