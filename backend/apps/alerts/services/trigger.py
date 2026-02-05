from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.alerts.models import AlertEvent, AlertEventStatus, AlertRule, UserAlertRule
from apps.alerts.services.push import PushSendError, send_push


def compute_thresholds(
    user_rule: UserAlertRule, rule: AlertRule
) -> tuple[int | None, int | None]:
    min_v = (
        user_rule.min_glycemia_override
        if user_rule.min_glycemia_override is not None
        else rule.min_glycemia
    )
    max_v = (
        user_rule.max_glycemia_override
        if user_rule.max_glycemia_override is not None
        else rule.max_glycemia
    )
    return min_v, max_v


def matches(min_v: int | None, max_v: int | None, value: int) -> bool:
    # bornes inclusives
    if min_v is not None and value < min_v:
        return True
    if max_v is not None and value > max_v:
        return True
    return False


def can_send_push(user, rule: AlertRule, cooldown_seconds: int) -> bool:
    since = timezone.now() - timedelta(seconds=cooldown_seconds)
    return not AlertEvent.objects.filter(
        user=user,
        rule=rule,
        push_sent_at__gte=since,
    ).exists()


@transaction.atomic
def trigger_for_value(*, user, glycemia_value: int) -> list[AlertEvent]:
    """
    Appelée à chaque nouvelle mesure.
    - 1 AlertEvent par règle matchée
    - in-app systématique
    - push si cooldown OK
    """
    events: list[AlertEvent] = []

    user_rules = UserAlertRule.objects.select_related("rule").filter(
        user=user, enabled=True, rule__is_active=True
    )

    now = timezone.now()

    for ur in user_rules:
        rule = ur.rule
        min_v, max_v = compute_thresholds(ur, rule)

        if not matches(min_v, max_v, glycemia_value):
            continue

        event = AlertEvent.objects.create(
            user=user,
            rule=rule,
            glycemia_value=glycemia_value,
            status=AlertEventStatus.TRIGGERED,
            inapp_created_at=now,
        )

        if can_send_push(user, rule, ur.cooldown_seconds):
            try:
                send_push(
                    user=user,
                    title=rule.name,
                    body=f"Glycémie: {glycemia_value} mg/dL",
                    data={"rule": rule.code, "event_id": event.id},
                )
                event.push_sent_at = now
                event.status = AlertEventStatus.SENT
                event.save(update_fields=["push_sent_at", "status"])
            except PushSendError as e:
                event.status = AlertEventStatus.FAILED
                event.error_message = str(e)
                event.save(update_fields=["status", "error_message"])

        events.append(event)

    return events


@transaction.atomic
def ack_event(*, user, event_id: int) -> AlertEvent:
    event = AlertEvent.objects.select_for_update().get(id=event_id, user=user)
    if event.acked_at is None:
        event.acked_at = timezone.now()
        event.status = AlertEventStatus.ACKED
        event.save(update_fields=["acked_at", "status"])
    return event
