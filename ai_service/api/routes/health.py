import time
from fastapi import APIRouter
from api.schemas import HealthResponse
from core.config import settings

router = APIRouter()
_start_time = time.time()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    from models.ensemble import ensemble_model

    loaded = ensemble_model.models_loaded()
    all_ok = all(loaded.values())

    return HealthResponse(
        status="ok" if all_ok else "degraded",
        models_loaded=loaded,
        model_version=settings.model_version,
        uptime_seconds=int(time.time() - _start_time),
    )
