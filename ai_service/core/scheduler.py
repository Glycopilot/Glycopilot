"""
Scheduler hebdomadaire — déclenche le fine-tuning pour tous les patients actifs.

Utilise APScheduler (BackgroundScheduler).
Le scheduler démarre au lancement du service et tourne en arrière-plan.
"""
from __future__ import annotations

from core.logger import get_logger

logger = get_logger(__name__)


def _finetune_all_patients() -> None:
    """
    Récupère la liste des patients actifs depuis Django et
    déclenche le fine-tuning pour chacun séquentiellement.
    """
    import os
    import requests
    from core.config import settings
    from training.finetune_patient import load_patient_data_from_api, finetune
    from models.personal_lstm import personal_lstm_manager

    logger.info("[Scheduler] Démarrage du fine-tuning hebdomadaire...")

    if not settings.django_url or not settings.django_internal_token:
        logger.warning("[Scheduler] django_url ou django_internal_token non configuré — fine-tuning ignoré.")
        return

    try:
        headers = {"Authorization": f"Bearer {settings.django_internal_token}"}
        resp = requests.get(
            f"{settings.django_url}/api/users/",
            params={"role": "PATIENT", "is_active": "true"},
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        patients = data.get("results", data) if isinstance(data, dict) else data
    except Exception as exc:
        logger.error(f"[Scheduler] Impossible de récupérer la liste des patients: {exc}")
        return

    version = settings.model_version.replace("ensemble_", "")
    global_model_path = os.path.join(settings.artifacts_dir, "lstm", f"lstm_{version}.pt")

    if not os.path.exists(global_model_path):
        logger.error(f"[Scheduler] Modèle global introuvable : {global_model_path}")
        return

    success, skipped, failed = 0, 0, 0
    for patient in patients:
        patient_id = str(patient.get("id_user") or patient.get("id") or "")
        if not patient_id:
            continue
        try:
            df = load_patient_data_from_api(patient_id, settings.django_url, settings.django_internal_token)
            finetune(
                patient_id=patient_id,
                df=df,
                global_model_path=global_model_path,
                version=version,
            )
            personal_lstm_manager.invalidate(patient_id)
            success += 1
        except ValueError as exc:
            logger.info(f"[Scheduler] Patient {patient_id} ignoré : {exc}")
            skipped += 1
        except Exception as exc:
            logger.error(f"[Scheduler] Échec patient {patient_id} : {exc}")
            failed += 1

    logger.info(
        f"[Scheduler] Fine-tuning hebdomadaire terminé — "
        f"{success} succès / {skipped} ignorés (données insuffisantes) / {failed} échecs"
    )


def start_scheduler():
    """Démarre le scheduler APScheduler. Appeler au démarrage du service."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
    except ImportError:
        logger.warning(
            "[Scheduler] apscheduler non installé — fine-tuning automatique désactivé. "
            "Installez-le avec : pip install apscheduler"
        )
        return None

    scheduler = BackgroundScheduler()
    scheduler.add_job(
        _finetune_all_patients,
        trigger="interval",
        weeks=1,
        id="weekly_finetune",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info("[Scheduler] Scheduler hebdomadaire démarré — fine-tuning toutes les 7 jours.")
    return scheduler
