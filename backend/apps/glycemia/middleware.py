"""
JWT authentication middleware for WebSocket connections.

Extracts JWT token from query string and authenticates the user.
Usage: wss://host/ws/glycemia/?token=<jwt_access_token>
"""

from urllib.parse import parse_qs

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

import jwt
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_str):
    """
    Validate JWT token and return the associated user.
    Supports dual-key authentication (SECRET_KEY and SECRET_KEY_ADMIN).
    """
    if not token_str:
        return AnonymousUser()

    # USER_ID_CLAIM is the claim name in the token (default: "user_id")
    # USER_ID_FIELD is the model field name (e.g., "id_auth")
    user_id_claim = settings.SIMPLE_JWT.get("USER_ID_CLAIM", "user_id")
    user_id_field = settings.SIMPLE_JWT.get("USER_ID_FIELD", "id")

    # Try with main SECRET_KEY first
    try:
        token = AccessToken(token_str)
        user_id = token.get(user_id_claim)
        user = User.objects.get(**{user_id_field: user_id})
        return user
    except (InvalidToken, TokenError, User.DoesNotExist):
        pass
    except Exception:
        pass

    # Try with SECRET_KEY_ADMIN if configured
    admin_key = getattr(settings, "SECRET_KEY_ADMIN", None)
    if admin_key:
        try:
            payload = jwt.decode(
                token_str,
                admin_key,
                algorithms=["HS256"],
            )
            user_id = payload.get(user_id_claim)
            user = User.objects.get(**{user_id_field: user_id})
            return user
        except Exception:
            pass

    return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Middleware that authenticates WebSocket connections using JWT from query string.
    """

    async def __call__(self, scope, receive, send):
        # Extract token from query string
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token_list = query_params.get("token", [])
        token = token_list[0] if token_list else None

        # Authenticate user
        scope["user"] = await get_user_from_token(token)

        return await super().__call__(scope, receive, send)
