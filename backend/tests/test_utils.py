"""Tests for dual-key JWT authentication and role-based permission decorator."""
from unittest.mock import MagicMock, patch

import pytest
from rest_framework.exceptions import NotAuthenticated, PermissionDenied
from rest_framework_simplejwt.exceptions import InvalidToken

from utils.jwt_auth import JWTAuthenticationDualKey, _PayloadWrapper
from utils.permissions import allowed_roles

# ─── _PayloadWrapper ─────────────────────────────────────────────────────────


class TestPayloadWrapper:
    def test_getitem_returns_value(self):
        wrapper = _PayloadWrapper({"user_id": 42, "role": "PATIENT"})
        assert wrapper["user_id"] == 42

    def test_get_returns_value(self):
        wrapper = _PayloadWrapper({"user_id": 42})
        assert wrapper.get("user_id") == 42

    def test_get_returns_default_when_missing(self):
        wrapper = _PayloadWrapper({})
        assert wrapper.get("missing_key", "default") == "default"
        assert wrapper.get("missing_key") is None


# ─── JWTAuthenticationDualKey ────────────────────────────────────────────────


class TestJWTAuthenticationDualKey:
    def test_valid_primary_key_token_accepted(self):
        """Standard SimpleJWT token validated with primary key."""
        auth = JWTAuthenticationDualKey()
        mock_token = MagicMock()

        with patch(
            "utils.jwt_auth.api_settings.AUTH_TOKEN_CLASSES",
            [lambda raw: mock_token],
        ):
            result = auth.get_validated_token(b"valid-token")
            assert result == mock_token

    def test_invalid_token_raises_invalid_token(self):
        """All keys fail → InvalidToken raised."""
        auth = JWTAuthenticationDualKey()

        def always_fail(raw):
            raise InvalidToken("bad token")

        with patch("utils.jwt_auth.api_settings.AUTH_TOKEN_CLASSES", [always_fail]):
            with patch("utils.jwt_auth.getattr", return_value=None):
                with pytest.raises(InvalidToken):
                    auth.get_validated_token(b"garbage-token")

    def test_admin_key_used_as_fallback(self):
        """When primary key fails, admin key is tried."""
        auth = JWTAuthenticationDualKey()

        def primary_fail(raw):
            raise InvalidToken("primary key fail")

        fake_payload = {"user_id": 99, "role": "ADMIN"}

        with patch("utils.jwt_auth.api_settings.AUTH_TOKEN_CLASSES", [primary_fail]):
            with patch("utils.jwt_auth.getattr") as mock_getattr:
                mock_getattr.return_value = "fake-admin-secret"
                with patch("utils.jwt_auth.jwt.decode", return_value=fake_payload):
                    result = auth.get_validated_token("fake-admin-token")
                    assert isinstance(result, _PayloadWrapper)
                    assert result["user_id"] == 99

    def test_admin_key_fallback_fails_raises_invalid_token(self):
        """Both primary and admin key fail → InvalidToken."""
        auth = JWTAuthenticationDualKey()

        def primary_fail(raw):
            raise InvalidToken("fail")

        with patch("utils.jwt_auth.api_settings.AUTH_TOKEN_CLASSES", [primary_fail]):
            with patch("utils.jwt_auth.getattr") as mock_getattr:
                mock_getattr.return_value = "fake-admin-secret"
                with patch(
                    "utils.jwt_auth.jwt.decode", side_effect=Exception("decode error")
                ):
                    with pytest.raises(InvalidToken):
                        auth.get_validated_token("bad-token")


# ─── allowed_roles decorator ─────────────────────────────────────────────────


class TestAllowedRolesDecorator:
    def _make_request(self, user=None, authenticated=True):
        request = MagicMock()
        request.user = user or MagicMock()
        request.user.is_authenticated = authenticated
        return request

    def test_allowed_role_passes(self):
        @allowed_roles(["PATIENT"])
        def view(request, *args, **kwargs):
            return "ok"

        request = self._make_request()
        request.user.role = "PATIENT"
        result = view(request)
        assert result == "ok"

    def test_disallowed_role_raises_permission_denied(self):
        @allowed_roles(["ADMIN"])
        def view(request, *args, **kwargs):
            return "ok"

        request = self._make_request()
        request.user.role = "PATIENT"
        with pytest.raises(PermissionDenied):
            view(request)

    def test_unauthenticated_raises_not_authenticated(self):
        @allowed_roles(["PATIENT"])
        def view(request, *args, **kwargs):
            return "ok"

        request = self._make_request(authenticated=False)
        with pytest.raises(NotAuthenticated):
            view(request)

    def test_user_without_role_attribute_raises_permission_denied(self):
        @allowed_roles(["PATIENT"])
        def view(request, *args, **kwargs):
            return "ok"

        request = self._make_request()
        # Simulate user without `role` attribute
        del request.user.role
        with pytest.raises(PermissionDenied):
            view(request)

    def test_multiple_allowed_roles(self):
        @allowed_roles(["PATIENT", "DOCTOR"])
        def view(request, *args, **kwargs):
            return "ok"

        request = self._make_request()
        request.user.role = "DOCTOR"
        result = view(request)
        assert result == "ok"
