from django.contrib.auth import get_user_model

import pytest
from rest_framework.test import APIClient

from apps.alerts.models import AlertEvent, AlertRule, UserAlertRule
from apps.alerts.services.push import PushSendError
from apps.alerts.services.trigger import (
    ack_event,
    compute_thresholds,
    matches,
    trigger_for_value,
)

User = get_user_model()


def mk_user(email="u1@test.com"):
    return User.objects.create_user(email=email, password="x")


def mk_rule(code="HYPO", min_g=80, max_g=120):
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


@pytest.mark.django_db
def test_compute_thresholds_with_overrides():
    user = mk_user()
    rule = mk_rule(min_g=70, max_g=180)
    user_rule = UserAlertRule.objects.create(
        user=user,
        rule=rule,
        enabled=True,
        cooldown_seconds=600,
        min_glycemia_override=60,
        max_glycemia_override=200,
    )
    min_v, max_v = compute_thresholds(user_rule, rule)
    assert min_v == 60
    assert max_v == 200


def test_matches_thresholds():
    assert matches(70, 180, 60) is True
    assert matches(70, 180, 200) is True
    assert matches(70, 180, 120) is False


@pytest.mark.django_db
def test_trigger_push_failure_sets_failed(monkeypatch):
    user = mk_user(email="pushfail@test.com")
    rule = mk_rule(code="HYPER", min_g=70, max_g=180)
    UserAlertRule.objects.create(user=user, rule=rule, enabled=True, cooldown_seconds=0)

    def raise_error(**kwargs):
        raise PushSendError("push error")

    monkeypatch.setattr("apps.alerts.services.trigger.send_push", raise_error)

    events = trigger_for_value(user=user, glycemia_value=200)
    assert len(events) == 1
    event = events[0]
    event.refresh_from_db()
    assert event.status == "FAILED"
    assert "push error" in event.error_message


@pytest.mark.django_db
def test_ack_event_updates_status():
    user = mk_user(email="ack@test.com")
    rule = mk_rule()
    UserAlertRule.objects.create(
        user=user, rule=rule, enabled=True, cooldown_seconds=600
    )
    event = trigger_for_value(user=user, glycemia_value=70)[0]
    acked = ack_event(user=user, event_id=event.id)
    assert acked.acked_at is not None
    assert acked.status == "ACKED"
