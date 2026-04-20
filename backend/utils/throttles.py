from rest_framework.throttling import AnonRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    """Strict rate limiting for authentication endpoints (login, register, password reset)."""

    scope = "auth"
