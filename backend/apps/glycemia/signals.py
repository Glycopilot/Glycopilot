"""
Django signals for broadcasting glycemia updates via WebSocket.

When a GlycemiaHisto record is created, this signal broadcasts the data
to the user's WebSocket channel for real-time updates AND triggers
alert rules to create AlertEvent entries in the database.
It also fires an async AI prediction request (fire-and-forget thread).
"""

import logging
import threading

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import GlycemiaHisto

logger = logging.getLogger(__name__)

# Thresholds for glycemia alerts (mg/dL)
HYPO_THRESHOLD = 70
HYPER_THRESHOLD = 180


@receiver(post_save, sender=GlycemiaHisto)
def broadcast_glycemia_update(sender, instance, created, **kwargs):
    """
    Broadcast new glycemia readings to the user's WebSocket channel.

    Sends:
    - glycemia_update: For every new reading
    - glycemia_alert: When value is below HYPO_THRESHOLD or above HYPER_THRESHOLD

    Also triggers alert rules to create AlertEvent entries in the database.
    """
    if not created:
        return

    # ── 1. Trigger alert rules (DB) ──────────────────────────────
    events = []
    try:
        from apps.alerts.services.trigger import trigger_for_value

        events = trigger_for_value(
            user=instance.user,
            glycemia_value=int(instance.value),
        )
        if events:
            logger.info(
                f"Created {len(events)} alert event(s) for user "
                f"{instance.user.id_auth}: value={instance.value}"
            )
    except Exception as e:
        logger.error(f"Failed to trigger alert rules: {e}")

    # ── 1b. Notifier les proches (non-bloquant) ───────────────────
    if events:
        try:
            from apps.alerts.services.notify_proches import notify_proches_of_alert

            threading.Thread(
                target=notify_proches_of_alert,
                args=(instance.user, events),
                daemon=True,
            ).start()
        except Exception as e:
            logger.error(f"Failed to start proche alert notification thread: {e}")

    # ── 2. WebSocket broadcast ───────────────────────────────────
    channel_layer = get_channel_layer()
    if channel_layer is None:
        logger.warning("Channel layer not configured, skipping WebSocket broadcast")
        return

    group_name = f"glycemia_user_{instance.user.id_auth}"

    # Prepare the data payload
    data = {
        "reading_id": str(instance.reading_id),
        "value": instance.value,
        "unit": instance.unit,
        "measured_at": instance.measured_at.isoformat(),
        "recorded_at": instance.recorded_at.isoformat()
        if instance.recorded_at
        else None,
        "trend": instance.trend,
        "rate": instance.rate,
        "source": instance.source,
        "context": instance.context,
    }

    # Send glycemia update
    try:
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "glycemia_update",
                "data": data,
            },
        )
        logger.info(
            f"Broadcast glycemia_update to {group_name}: {instance.value} {instance.unit}"
        )
    except Exception as e:
        logger.error(f"Failed to broadcast glycemia_update: {e}")

    # Check for alerts
    if instance.value < HYPO_THRESHOLD:
        alert_type = "hypoglycemia"
    elif instance.value > HYPER_THRESHOLD:
        alert_type = "hyperglycemia"
    else:
        alert_type = None

    if alert_type:
        try:
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "glycemia_alert",
                    "alert_type": alert_type,
                    "data": data,
                },
            )
            logger.warning(
                f"Broadcast glycemia_alert ({alert_type}) to {group_name}: {instance.value} {instance.unit}"
            )
        except Exception as e:
            logger.error(f"Failed to broadcast glycemia_alert: {e}")

    # ── 3. AI prediction (non-blocking) ─────────────────────────
    if not getattr(settings, "TESTING", False):
        try:
            from apps.glycemia.services.ia_client import request_prediction

            threading.Thread(
                target=request_prediction,
                args=(instance,),
                daemon=True,
            ).start()
        except Exception as e:
            logger.error(f"Failed to start AI prediction thread: {e}")
