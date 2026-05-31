"""Tests de l'authentification à deux facteurs par code email (opt-in)."""

from unittest.mock import patch

from django.urls import reverse

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.profiles.models import Profile, Role
from apps.users.models import AuthAccount, User

SEND_PATH = "apps.auth.two_factor.send_2fa_code_email"


@pytest.mark.django_db
class TestTwoFactor:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.patient_role = Role.objects.create(name="PATIENT")
        identity = User.objects.create(first_name="Jane", last_name="Doe")
        self.account = AuthAccount.objects.create_user(
            email="jane@example.com", password="Password123", user_identity=identity
        )
        Profile.objects.create(user=identity, role=self.patient_role)
        self.client = APIClient()

    def _auth(self):
        self.client.force_authenticate(user=self.account)

    def _get_code(self, mock_send):
        # generate_and_send_otp(account) appelle send_2fa_code_email(email, code)
        return mock_send.call_args.args[1]

    # ── Login sans 2FA : comportement inchangé (non-régression) ───────────────
    def test_login_without_2fa_returns_tokens(self):
        resp = self.client.post(
            reverse("login"), {"email": "jane@example.com", "password": "Password123"}
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data and "refresh" in resp.data
        assert "requires_2fa" not in resp.data

    # ── Activation ────────────────────────────────────────────────────────────
    def test_enable_2fa_with_valid_code(self):
        self._auth()
        with patch(SEND_PATH) as mock_send:
            r1 = self.client.post(reverse("send_2fa_code"))
            assert r1.status_code == status.HTTP_200_OK
            code = self._get_code(mock_send)

        r2 = self.client.post(reverse("enable_2fa"), {"code": code})
        assert r2.status_code == status.HTTP_200_OK
        self.account.refresh_from_db()
        assert self.account.two_factor_enabled is True

    def test_enable_2fa_with_wrong_code_fails(self):
        self._auth()
        with patch(SEND_PATH):
            self.client.post(reverse("send_2fa_code"))
        r = self.client.post(reverse("enable_2fa"), {"code": "000000"})
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        self.account.refresh_from_db()
        assert self.account.two_factor_enabled is False

    # ── Login avec 2FA : challenge puis vérification ──────────────────────────
    def _enable_2fa_directly(self):
        self.account.two_factor_enabled = True
        self.account.save(update_fields=["two_factor_enabled"])

    def test_login_with_2fa_returns_challenge_not_tokens(self):
        self._enable_2fa_directly()
        with patch(SEND_PATH) as mock_send:
            resp = self.client.post(
                reverse("login"),
                {"email": "jane@example.com", "password": "Password123"},
            )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data.get("requires_2fa") is True
        assert "challenge" in resp.data
        assert "access" not in resp.data
        mock_send.assert_called_once()

    def test_verify_2fa_success_returns_tokens(self):
        self._enable_2fa_directly()
        with patch(SEND_PATH) as mock_send:
            login = self.client.post(
                reverse("login"),
                {"email": "jane@example.com", "password": "Password123"},
            )
            code = self._get_code(mock_send)
        challenge = login.data["challenge"]

        resp = self.client.post(
            reverse("verify_2fa"), {"challenge": challenge, "code": code}
        )
        assert resp.status_code == status.HTTP_200_OK
        assert "access" in resp.data and "refresh" in resp.data

    def test_verify_2fa_wrong_code_fails(self):
        self._enable_2fa_directly()
        with patch(SEND_PATH):
            login = self.client.post(
                reverse("login"),
                {"email": "jane@example.com", "password": "Password123"},
            )
        resp = self.client.post(
            reverse("verify_2fa"),
            {"challenge": login.data["challenge"], "code": "999999"},
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "access" not in resp.data

    def test_verify_2fa_invalid_challenge_fails(self):
        self._enable_2fa_directly()
        resp = self.client.post(
            reverse("verify_2fa"), {"challenge": "garbage", "code": "123456"}
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    # ── Désactivation ─────────────────────────────────────────────────────────
    def test_disable_2fa_with_valid_code(self):
        self._enable_2fa_directly()
        self._auth()
        with patch(SEND_PATH) as mock_send:
            self.client.post(reverse("send_2fa_code"))
            code = self._get_code(mock_send)
        r = self.client.post(reverse("disable_2fa"), {"code": code})
        assert r.status_code == status.HTTP_200_OK
        self.account.refresh_from_db()
        assert self.account.two_factor_enabled is False

    # ── Code à usage unique : non rejouable ───────────────────────────────────
    def test_code_is_single_use(self):
        self._enable_2fa_directly()
        with patch(SEND_PATH) as mock_send:
            login = self.client.post(
                reverse("login"),
                {"email": "jane@example.com", "password": "Password123"},
            )
            code = self._get_code(mock_send)
        challenge = login.data["challenge"]
        first = self.client.post(
            reverse("verify_2fa"), {"challenge": challenge, "code": code}
        )
        assert first.status_code == status.HTTP_200_OK
        # Rejouer le même code doit échouer (consommé)
        replay = self.client.post(
            reverse("verify_2fa"), {"challenge": challenge, "code": code}
        )
        assert replay.status_code == status.HTTP_400_BAD_REQUEST
