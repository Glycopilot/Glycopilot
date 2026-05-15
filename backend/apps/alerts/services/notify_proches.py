"""
Notifications push vers les proches lors du déclenchement d'alertes glycémiques.

Appelé depuis glycemia/signals.py en thread non-bloquant, après trigger_for_value.
Un proche sans AuthAccount actif est silencieusement ignoré.
"""

import logging

from apps.alerts.models import AlertEvent
from apps.notifications.services import send_push_to_user

logger = logging.getLogger(__name__)

_PROCHE_ROLES = {"FAMILY", "CAREGIVER", "NURSE"}


def notify_proches_of_alert(patient_auth, events: list[AlertEvent]) -> None:
    """
    Envoie une notification push à chaque proche actif du patient pour chaque
    alerte déclenchée. Les échecs individuels sont loggés sans interrompre les autres.

    Args:
        patient_auth : AuthAccount du patient dont la glycémie vient d'être mesurée
        events       : liste d'AlertEvent créés par trigger_for_value
    """
    if not events:
        return

    from apps.doctors.models import PatientCareTeam
    from apps.users.models import AuthAccount

    patient_user = patient_auth.user
    patient_name = f"{patient_user.first_name} {patient_user.last_name}".strip() or "Votre proche"

    # Résoudre le PatientProfile du patient
    patient_role_profile = patient_user.profiles.filter(role__name__iexact="PATIENT").first()
    if not patient_role_profile or not hasattr(patient_role_profile, "patient_profile"):
        logger.warning(
            f"[PROCHE ALERT] Pas de PatientProfile pour user={patient_user.id_user}"
        )
        return

    patient_profile = patient_role_profile.patient_profile

    care_team_members = list(
        PatientCareTeam.objects.filter(
            patient_profile=patient_profile,
            role__in=_PROCHE_ROLES,
            status__label="ACTIVE",
        ).select_related("member_profile__user")
    )

    if not care_team_members:
        return

    logger.info(
        f"[PROCHE ALERT] {len(events)} alert(s) → notifying {len(care_team_members)} proche(s) "
        f"for patient={patient_user.id_user}"
    )

    for event in events:
        rule = event.rule
        title = f"Alerte pour {patient_name}"
        body = f"{rule.name} : {event.glycemia_value} mg/dL"
        payload = {
            "rule": rule.code,
            "event_id": event.id,
            "patient_user_id": str(patient_user.id_user),
        }

        for member in care_team_members:
            if not member.member_profile:
                continue
            try:
                member_auth = AuthAccount.objects.get(
                    user=member.member_profile.user, is_active=True
                )
                result = send_push_to_user(member_auth, title, body, payload)
                if result.get("success"):
                    logger.info(
                        f"[PROCHE ALERT] Push OK → {member_auth.email} "
                        f"rule={rule.code} event={event.id}"
                    )
                else:
                    logger.warning(
                        f"[PROCHE ALERT] Push non envoyé → {member_auth.email}: "
                        f"{result.get('error')}"
                    )
            except AuthAccount.DoesNotExist:
                # Proche sans compte actif (ajouté sans email ou invitation en attente)
                pass
            except Exception as exc:
                logger.error(
                    f"[PROCHE ALERT] Échec push pour membre "
                    f"{member.member_profile.user}: {exc}"
                )
