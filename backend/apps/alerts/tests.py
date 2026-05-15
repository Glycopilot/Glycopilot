from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model

import pytest
from rest_framework.test import APIClient

from apps.alerts.models import AlertEvent, AlertRule, UserAlertRule
from apps.alerts.services.trigger import trigger_for_value

User = get_user_model()


def mk_user(email="u1@test.com"):
    return User.objects.create_user(email=email, password="x")


def mk_rule(code="HYPO", min_g=None, max_g=80):
    return AlertRule.objects.create(
        code=code,
        name=code,
        min_glycemia=min_g,
        max_glycemia=max_g,
        severity=4,
        is_active=True,
    )


@pytest.mark.django_db
def test_trigger_creates_inapp_event():
    user = mk_user()
    rule = mk_rule()
    UserAlertRule.objects.create(
        user=user, rule=rule, enabled=True, cooldown_seconds=600
    )

    events = trigger_for_value(user=user, glycemia_value=70)

    assert len(events) == 1
    e = events[0]
    assert e.inapp_created_at is not None
    assert AlertEvent.objects.count() == 1


@pytest.mark.django_db
def test_ack_endpoint_sets_acked_at():
    user = mk_user()
    rule = mk_rule()
    UserAlertRule.objects.create(
        user=user, rule=rule, enabled=True, cooldown_seconds=600
    )

    event = trigger_for_value(user=user, glycemia_value=70)[0]

    client = APIClient()
    client.force_authenticate(user=user)

    resp = client.post("/api/alerts/events/ack/", {"event_id": event.id}, format="json")
    assert resp.status_code == 200

    event.refresh_from_db()
    assert event.acked_at is not None
    assert event.status == "ACKED"


@pytest.mark.django_db
def test_push_title_includes_app_name_and_rule():
    """Le titre du push doit être 'Glycopilot: 🩸 <rule.name>'."""
    user = mk_user("push_title@test.com")
    rule = mk_rule(code="HYPO", max_g=80)
    rule.name = "Hypoglycémie"
    rule.save()
    UserAlertRule.objects.create(
        user=user, rule=rule, enabled=True, cooldown_seconds=0
    )

    with patch("apps.alerts.services.trigger.send_push") as mock_push:
        mock_push.return_value = None
        trigger_for_value(user=user, glycemia_value=70)

    mock_push.assert_called_once()
    call_kwargs = mock_push.call_args[1]
    assert call_kwargs["title"] == "Glycopilot: 🩸 Hypoglycémie"


@pytest.mark.django_db
def test_push_title_reflects_rule_name():
    """Le titre change selon le nom de la règle (hyper vs hypo)."""
    user = mk_user("push_title2@test.com")
    rule = AlertRule.objects.create(
        code="HYPER",
        name="Hyperglycémie",
        min_glycemia=250,
        max_glycemia=None,
        severity=3,
        is_active=True,
    )
    UserAlertRule.objects.create(
        user=user, rule=rule, enabled=True, cooldown_seconds=0
    )

    with patch("apps.alerts.services.trigger.send_push") as mock_push:
        mock_push.return_value = None
        trigger_for_value(user=user, glycemia_value=300)

    mock_push.assert_called_once()
    call_kwargs = mock_push.call_args[1]
    assert call_kwargs["title"] == "Glycopilot: 🩸 Hyperglycémie"


@pytest.mark.django_db
def test_cooldown_allows_history_but_limits_push():
    user = mk_user()
    rule = mk_rule()
    UserAlertRule.objects.create(
        user=user, rule=rule, enabled=True, cooldown_seconds=600
    )

    trigger_for_value(user=user, glycemia_value=70)
    trigger_for_value(user=user, glycemia_value=70)

    # Historique conservé
    assert AlertEvent.objects.count() == 2

    # Push limité : comme send_push est un stub, push_sent_at sera mis quand même (logique interne),
    # mais la 2e occurrence doit normalement être bloquée par can_send_push.
    events = list(AlertEvent.objects.order_by("triggered_at"))
    assert events[0].push_sent_at is not None
    assert events[1].push_sent_at is None


# ---------------------------------------------------------------------------
# notify_proches_of_alert
# ---------------------------------------------------------------------------

def _make_patient_with_profile(email="pat@test.com"):
    from apps.profiles.models import Profile, Role
    from apps.users.models import User as UserIdentity
    Role.objects.get_or_create(name="PATIENT")
    identity = UserIdentity.objects.create(first_name="Patient", last_name="Test")
    account = User.objects.create_user(email=email, password="pass", user_identity=identity)
    Profile.objects.create(user=identity, role=Role.objects.get(name="PATIENT"))
    return account


def _make_proche_with_account(patient_auth, email="proche@test.com", is_active=True):
    from apps.doctors.models import InvitationStatus, PatientCareTeam
    from apps.profiles.models import Profile, Role
    from apps.users.models import User as UserIdentity
    Role.objects.get_or_create(name="FAMILY")
    InvitationStatus.objects.get_or_create(label="ACTIVE")
    identity = UserIdentity.objects.create(first_name="Proche", last_name="Test")
    account = User.objects.create_user(email=email, password="pass", user_identity=identity)
    account.is_active = is_active
    account.save(update_fields=["is_active"])
    role_obj = Role.objects.get(name="FAMILY")
    member_profile = Profile.objects.create(user=identity, role=role_obj)
    patient_profile = (
        patient_auth.user.profiles.filter(role__name="PATIENT").first().patient_profile
    )
    PatientCareTeam.objects.create(
        patient_profile=patient_profile,
        member_profile=member_profile,
        role="FAMILY",
        status=InvitationStatus.objects.get(label="ACTIVE"),
    )
    return account


def _make_event(patient_auth, code="HYPO"):
    rule = AlertRule.objects.create(
        code=code, name=code, max_glycemia=70, severity=5, is_active=True
    )
    return AlertEvent.objects.create(
        user=patient_auth, rule=rule, glycemia_value=65,
    )


@pytest.mark.django_db
def test_notify_proches_sends_push_to_active_proche():
    patient = _make_patient_with_profile("pat_notif@test.com")
    proche = _make_proche_with_account(patient, "proche_notif@test.com")
    event = _make_event(patient)

    with patch("apps.alerts.services.notify_proches.send_push_to_user") as mock_push:
        mock_push.return_value = {"success": True}
        from apps.alerts.services.notify_proches import notify_proches_of_alert
        notify_proches_of_alert(patient, [event])

    mock_push.assert_called_once()
    call_args = mock_push.call_args
    assert call_args[0][0].email == "proche_notif@test.com"
    assert "Patient Test" in call_args[0][1]  # title contient le nom du patient


@pytest.mark.django_db
def test_notify_proches_ignores_proche_without_account():
    """Un proche sans AuthAccount (shell) ne doit pas planter."""
    from apps.doctors.models import InvitationStatus, PatientCareTeam
    from apps.profiles.models import Profile, Role
    from apps.users.models import User as UserIdentity
    patient = _make_patient_with_profile("pat_shell@test.com")
    Role.objects.get_or_create(name="FAMILY")
    InvitationStatus.objects.get_or_create(label="ACTIVE")
    identity = UserIdentity.objects.create(first_name="Shell", last_name="Proche")
    role_obj = Role.objects.get(name="FAMILY")
    member_profile = Profile.objects.create(user=identity, role=role_obj)
    patient_profile = patient.user.profiles.filter(role__name="PATIENT").first().patient_profile
    PatientCareTeam.objects.create(
        patient_profile=patient_profile,
        member_profile=member_profile,
        role="FAMILY",
        status=InvitationStatus.objects.get(label="ACTIVE"),
    )
    event = _make_event(patient, code="HYPO2")

    with patch("apps.alerts.services.notify_proches.send_push_to_user") as mock_push:
        from apps.alerts.services.notify_proches import notify_proches_of_alert
        notify_proches_of_alert(patient, [event])

    mock_push.assert_not_called()


@pytest.mark.django_db
def test_notify_proches_ignores_inactive_proche_account():
    patient = _make_patient_with_profile("pat_inactive@test.com")
    _make_proche_with_account(patient, "proche_inactive@test.com", is_active=False)
    event = _make_event(patient, code="HYPO3")

    with patch("apps.alerts.services.notify_proches.send_push_to_user") as mock_push:
        from apps.alerts.services.notify_proches import notify_proches_of_alert
        notify_proches_of_alert(patient, [event])

    mock_push.assert_not_called()


@pytest.mark.django_db
def test_notify_proches_empty_events_does_nothing():
    patient = _make_patient_with_profile("pat_empty@test.com")
    _make_proche_with_account(patient, "proche_empty@test.com")

    with patch("apps.alerts.services.notify_proches.send_push_to_user") as mock_push:
        from apps.alerts.services.notify_proches import notify_proches_of_alert
        notify_proches_of_alert(patient, [])

    mock_push.assert_not_called()
