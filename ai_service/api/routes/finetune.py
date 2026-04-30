"""
Route de déclenchement du fine-tuning par patient.

POST /finetune/{patient_id}  — déclenche le fine-tuning en arrière-plan
GET  /finetune/{patient_id}/status — vérifie si un modèle personnel existe
"""
from __future__ import annotations

import os
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel

from api.routes.predict import _verify_token
from core.config import settings
from core.logger import get_logger
from models.personal_lstm import personal_lstm_manager

logger = get_logger(__name__)
router = APIRouter(prefix="/finetune", tags=["finetune"])


class FinetuneRequest(BaseModel):
    django_token: str = ""
    version: str = "v1.0"
    epochs: int = 30
    device: str = "cpu"


class FinetuneStatus(BaseModel):
    patient_id: str
    has_personal_model: bool
    model_path: str | None = None


def _run_finetune(patient_id: str, django_token: str, version: str, epochs: int, device: str) -> None:
    """Executed in background — fetches patient data from Django and fine-tunes."""
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

    from training.finetune_patient import load_patient_data_from_api, finetune

    try:
        logger.info(f"[Fine-tune] Démarrage pour patient {patient_id}")
        df = load_patient_data_from_api(patient_id, settings.django_url, django_token)
        global_model_path = os.path.join(settings.artifacts_dir, "lstm", f"lstm_{version}.pt")
        metrics = finetune(
            patient_id=patient_id,
            df=df,
            global_model_path=global_model_path,
            version=version,
            epochs=epochs,
            device=device,
        )
        personal_lstm_manager.invalidate(patient_id)
        logger.info(f"[Fine-tune] Terminé pour patient {patient_id} — MAE@30: {metrics.get('mae_30', '?')}")
    except ValueError as exc:
        logger.warning(f"[Fine-tune] Ignoré pour patient {patient_id}: {exc}")
    except Exception as exc:
        logger.error(f"[Fine-tune] Échec pour patient {patient_id}: {exc}")


@router.post("/{patient_id}")
async def trigger_finetune(
    patient_id: str,
    body: FinetuneRequest,
    background_tasks: BackgroundTasks,
    x_internal_token: str | None = Header(None, alias="X-Internal-Token"),
):
    """Déclenche le fine-tuning d'un patient en arrière-plan. Répond immédiatement."""
    _verify_token(x_internal_token)
    background_tasks.add_task(
        _run_finetune,
        patient_id,
        body.django_token or settings.django_internal_token,
        body.version,
        body.epochs,
        body.device,
    )
    return {"status": "started", "patient_id": patient_id, "message": "Fine-tuning lancé en arrière-plan."}


@router.get("/{patient_id}/status")
async def finetune_status(
    patient_id: str,
    version: str = "v1.0",
    x_internal_token: str | None = Header(None, alias="X-Internal-Token"),
) -> FinetuneStatus:
    """Vérifie si un modèle personnel existe pour ce patient."""
    _verify_token(x_internal_token)
    has_model = personal_lstm_manager.has_model(patient_id, version)
    model_path = None
    if has_model:
        model_path = os.path.join(settings.artifacts_dir, "patients", patient_id, f"lstm_personal_{version}.pt")
    return FinetuneStatus(patient_id=patient_id, has_personal_model=has_model, model_path=model_path)
