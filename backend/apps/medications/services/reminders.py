"""
Service d'envoi des rappels de médicaments via push notification.

Appelé par la management command `send_medication_reminders`
toutes les minutes (via le scheduler Docker).
"""

import logging  # NOSONAR
from datetime import timedelta

from django.utils import timezone

from apps.medications.models import IntakeStatus, MedicationIntake
from apps.notifications.services.push import send_push_to_user

logger = logging.getLogger(__name__)  # NOSONAR

# Fenêtre de tolérance : on envoie si l'heure est dans [now - 30s, now + 30s]
REMINDER_WINDOW_SECONDS = 30


def send_due_medication_reminders() -> dict:
    """
    Envoie les rappels push pour les prises prévues dans la prochaine minute.

    Returns:
        dict avec les stats : sent, skipped, errors
    """
    local_now = timezone.localtime(timezone.now())
    today = local_now.date()

    window_start = (local_now - timedelta(seconds=REMINDER_WINDOW_SECONDS)).time().replace(microsecond=0)
    window_end = (local_now + timedelta(seconds=REMINDER_WINDOW_SECONDS)).time().replace(microsecond=0)

    due_intakes = (
        MedicationIntake.objects.filter(
            scheduled_date=today,
            scheduled_time__gte=window_start,
            scheduled_time__lte=window_end,
            status=IntakeStatus.PENDING,
            schedule__reminder_enabled=True,
        )
        .select_related("user_medication__user", "user_medication__medication", "schedule")
    )

    stats = {"sent": 0, "skipped": 0, "errors": 0}

    for intake in due_intakes:
        user = intake.user_medication.user
        med_name = intake.user_medication.display_name

        try:
            result = send_push_to_user(
                user=user,
                title=" Glycopilot: 💊 Rappel médicament",
                body=f"C'est l'heure de prendre votre médicament {med_name}",
                data={
                    "type": "medication_reminder",
                    "intake_id": intake.id,
                    "medication_name": med_name,
                    "scheduled_time": str(intake.scheduled_time),
                },
            )
            if result.get("success"):
                stats["sent"] += 1
                logger.info("[REMINDER] sent intake=%s at=%s", intake.id, intake.scheduled_time)
            else:
                stats["skipped"] += 1
                logger.info("[REMINDER] skipped intake=%s reason=%s", intake.id, result.get("error"))
        except Exception as e:
            stats["errors"] += 1
            logger.error("[REMINDER] error intake=%s: %s", intake.id, e)

    logger.info("[REMINDER] done sent=%s skipped=%s errors=%s", stats["sent"], stats["skipped"], stats["errors"])
    return stats
