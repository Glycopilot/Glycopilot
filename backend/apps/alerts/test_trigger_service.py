from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone

import pytest

from apps.alerts.models import AlertEvent, AlertEventStatus, AlertRule, UserAlertRule
from apps.alerts.services.trigger import (
    ack_event,
    can_send_push,
    compute_thresholds,
    matches,
    trigger_for_value,
)

User = get_user_model()


def _mk_user(email="trigger@test.com"):
    return User.objects.create_user(email=email, password="pass123")


def _mk_rule(code="HYPO", min_g=None, max_g=80):
    return AlertRule.objects.create(
        code=code,
        name=code,
        min_glycemia=min_g,
        max_glycemia=max_g,
        severity=4,
        is_active=True,
    )


@pytest.mark.django_db
def test_compute_thresholds_prefers_user_overrides():
    user = _mk_user()
    rule = _mk_rule(min_g=70, max_g=180)
    ur = UserAlertRule.objects.create(
        user=user,
        rule=rule,
        min_glycemia_override=75,
        max_glycemia_override=170,
    )

    min_v, max_v = compute_thresholds(ur, rule)

    assert min_v == 75
    assert max_v == 170


@pytest.mark.django_db
def test_compute_thresholds_falls_back_to_rule_values():
    user = _mk_user("fallback@test.com")
    rule = _mk_rule(min_g=65, max_g=190)
    ur = UserAlertRule.objects.create(user=user, rule=rule)

    min_v, max_v = compute_thresholds(ur, rule)

    assert min_v == 65
    assert max_v == 190


def test_matches_inclusive_interval_and_unbounded_cases():
    assert matches(70, 180, 70) is True
    assert matches(70, 180, 180) is True
    assert matches(None, 69, 70) is False
    assert matches(181, None, 180) is False
    assert matches(None, None, 120) is False


@pytest.mark.django_db
def test_can_send_push_false_when_recent_event_exists():
    user = _mk_user("cooldown@test.com")
    rule = _mk_rule(code="HYPER", min_g=181, max_g=None)
    AlertEvent.objects.create(
        user=user, rule=rule, glycemia_value=220, push_sent_at=timezone.now()
    )

    assert can_send_push(user, rule, cooldown_seconds=600) is False


@pytest.mark.django_db
def test_trigger_for_value_skips_non_matching_rules():
    user = _mk_user("nomatch@test.com")
    low_rule = _mk_rule(code="HYPO2", min_g=None, max_g=69)
    UserAlertRule.objects.create(user=user, rule=low_rule, enabled=True, cooldown_seconds=0)

    events = trigger_for_value(user=user, glycemia_value=120)

    assert events == []
    assert AlertEvent.objects.count() == 0


@pytest.mark.django_db
def test_trigger_for_value_marks_failed_when_push_raises_custom_error():
    user = _mk_user("pushfail@test.com")
    rule = _mk_rule(code="HYPO3", min_g=None, max_g=75)
    UserAlertRule.objects.create(user=user, rule=rule, enabled=True, cooldown_seconds=0)

    with patch("apps.alerts.services.trigger.send_push", side_effect=Exception("network error")):
        events = trigger_for_value(user=user, glycemia_value=70)

    assert len(events) == 1
    event = events[0]
    event.refresh_from_db()
    assert event.status == AlertEventStatus.FAILED
    assert "network error" in (event.error_message or "")


@pytest.mark.django_db
def test_ack_event_is_idempotent():
    user = _mk_user("ack@test.com")
    rule = _mk_rule(code="ACK", min_g=None, max_g=80)
    event = AlertEvent.objects.create(
        user=user,
        rule=rule,
        glycemia_value=65,
        status=AlertEventStatus.TRIGGERED,
    )

    first = ack_event(user=user, event_id=event.id)
    first_acked_at = first.acked_at
    second = ack_event(user=user, event_id=event.id)

    assert first.status == AlertEventStatus.ACKED
    assert second.status == AlertEventStatus.ACKED
    assert second.acked_at == first_acked_at
