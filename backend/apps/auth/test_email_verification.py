"""
Tests : vérification d'email à l'inscription.

Couvre :
  - register() retourne un message (pas de JWT) et crée un compte inactif
  - verify_email() active le compte et retourne les JWT
  - resend_verification() renvoie l'email
  - _verify_email_domain() rejette les domaines sans MX
"""
from unittest.mock import patch

from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.auth.tokens import email_verification_token
from apps.profiles.models import Role
from apps.users.models import AuthAccount, User


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def required_roles(db):
    Role.objects.get_or_create(name="PATIENT")
    Role.objects.get_or_create(name="DOCTOR")


@pytest.fixture
def api():
    return APIClient()


def _register(api, email="user@test.com", extra=None):
    data = {
        "email": email,
        "password": "StrongPass123!",
        "password_confirm": "StrongPass123!",
        "first_name": "Jean",
        "last_name": "Test",
        "role": "PATIENT",
        **(extra or {}),
    }
    with patch("apps.auth.serializers._verify_email_domain"):
        return api.post("/api/auth/register/", data)


# ---------------------------------------------------------------------------
# register()
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_register_returns_message_not_jwt(api):
    resp = _register(api)
    assert resp.status_code == status.HTTP_201_CREATED
    assert "message" in resp.data
    assert "access" not in resp.data
    assert "refresh" not in resp.data


@pytest.mark.django_db
def test_register_creates_inactive_account(api):
    _register(api)
    account = AuthAccount.objects.get(email="user@test.com")
    assert account.is_active is False


@pytest.mark.django_db
def test_register_sends_verification_email(api, mailoutbox):
    _register(api, email="verif@test.com")
    assert len(mailoutbox) == 1
    mail = mailoutbox[0]
    assert mail.to == ["verif@test.com"]
    assert "verify-email" in mail.body


@pytest.mark.django_db
def test_register_doctor_is_not_affected_by_email_verification(api):
    """Les médecins gardent leur flow existant (bloqués par verification_status)."""
    from apps.doctors.models import VerificationStatus
    VerificationStatus.objects.get_or_create(label="PENDING")
    VerificationStatus.objects.get_or_create(label="VERIFIED")
    VerificationStatus.objects.get_or_create(label="REJECTED")
    data = {
        "email": "doc@test.com",
        "password": "StrongPass123!",
        "password_confirm": "StrongPass123!",
        "first_name": "Dr",
        "last_name": "Test",
        "role": "DOCTOR",
        "license_number": "RPPS-123",
        "specialty": "Généraliste",
    }
    with patch("apps.auth.serializers._verify_email_domain"):
        resp = api.post("/api/auth/register/", data)
    assert resp.status_code == status.HTTP_201_CREATED
    # Médecin : is_active reste True, bloqué différemment (verification_status)
    account = AuthAccount.objects.get(email="doc@test.com")
    assert account.is_active is True


# ---------------------------------------------------------------------------
# verify_email()
# ---------------------------------------------------------------------------

@pytest.fixture
def inactive_patient(db):
    identity = User.objects.create(first_name="Test", last_name="User")
    account = AuthAccount.objects.create_user(
        email="inactive@test.com", password="pass", user_identity=identity
    )
    account.is_active = False
    account.save(update_fields=["is_active"])
    from apps.profiles.models import Profile, Role as R
    role, _ = R.objects.get_or_create(name="PATIENT")
    Profile.objects.create(user=identity, role=role)
    return account


@pytest.mark.django_db
def test_verify_email_activates_account_and_returns_jwt(api, inactive_patient):
    uid = urlsafe_base64_encode(force_bytes(inactive_patient.pk))
    token = email_verification_token.make_token(inactive_patient)

    resp = api.post("/api/auth/verify-email/", {"uid": uid, "token": token})

    assert resp.status_code == status.HTTP_200_OK
    assert "access" in resp.data
    assert "refresh" in resp.data
    inactive_patient.refresh_from_db()
    assert inactive_patient.is_active is True


@pytest.mark.django_db
def test_verify_email_invalid_token_returns_400(api, inactive_patient):
    uid = urlsafe_base64_encode(force_bytes(inactive_patient.pk))
    resp = api.post("/api/auth/verify-email/", {"uid": uid, "token": "badtoken"})
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_verify_email_invalid_uid_returns_400(api):
    resp = api.post("/api/auth/verify-email/", {"uid": "notvalid==", "token": "x"})
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_verify_email_missing_fields_returns_400(api):
    resp = api.post("/api/auth/verify-email/", {})
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_verify_email_token_cannot_be_reused(api, inactive_patient):
    uid = urlsafe_base64_encode(force_bytes(inactive_patient.pk))
    token = email_verification_token.make_token(inactive_patient)

    api.post("/api/auth/verify-email/", {"uid": uid, "token": token})  # premier appel

    resp = api.post("/api/auth/verify-email/", {"uid": uid, "token": token})  # rejeu
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ---------------------------------------------------------------------------
# resend_verification()
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_resend_verification_sends_email(api, inactive_patient, mailoutbox):
    resp = api.post("/api/auth/resend-verification/", {"email": "inactive@test.com"})
    assert resp.status_code == status.HTTP_200_OK
    assert len(mailoutbox) == 1
    assert "verify-email" in mailoutbox[0].body


@pytest.mark.django_db
def test_resend_verification_unknown_email_returns_200_silently(api):
    """Réponse identique pour ne pas révéler si l'email est enregistré."""
    resp = api.post("/api/auth/resend-verification/", {"email": "ghost@test.com"})
    assert resp.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_resend_verification_active_account_does_not_send(api, mailoutbox):
    """Un compte déjà actif ne reçoit pas de nouvel email."""
    identity = User.objects.create(first_name="Active", last_name="User")
    AuthAccount.objects.create_user(
        email="active@test.com", password="pass", user_identity=identity
    )  # is_active=True par défaut
    api.post("/api/auth/resend-verification/", {"email": "active@test.com"})
    assert len(mailoutbox) == 0


# ---------------------------------------------------------------------------
# _verify_email_domain()
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_verify_email_domain_accepts_valid_domain():
    from apps.auth.serializers import _verify_email_domain
    # Aucune exception attendue
    _verify_email_domain("user@gmail.com")


@pytest.mark.django_db
def test_verify_email_domain_rejects_nonexistent_domain():
    from rest_framework import serializers as drf_serializers
    from apps.auth.serializers import _verify_email_domain
    with pytest.raises(drf_serializers.ValidationError):
        _verify_email_domain("user@domaine-inexistant-xyzabc999.com")


@pytest.mark.django_db
def test_verify_email_domain_rejects_domain_without_dot():
    from rest_framework import serializers as drf_serializers
    from apps.auth.serializers import _verify_email_domain
    with pytest.raises(drf_serializers.ValidationError):
        _verify_email_domain("user@localhost")


@pytest.mark.django_db
def test_register_with_fake_domain_returns_400(api):
    data = {
        "email": "test@domaine-inexistant-xyzabc999.com",
        "password": "StrongPass123!",
        "password_confirm": "StrongPass123!",
        "first_name": "Jean",
        "last_name": "Test",
        "role": "PATIENT",
    }
    resp = api.post("/api/auth/register/", data)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
