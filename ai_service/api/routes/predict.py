import time
from fastapi import APIRouter, Header, HTTPException
from api.schemas import PredictRequest, PredictResponse
from core.config import settings
from core.logger import get_logger
from features.engineering import build_features
from models.ensemble import ensemble_model

router = APIRouter()
logger = get_logger(__name__)


def _verify_token(token: str | None) -> None:
    if settings.internal_token and token != settings.internal_token:
        raise HTTPException(status_code=401, detail="Invalid internal token")


@router.post("/predict", response_model=PredictResponse)
async def predict(
    request: PredictRequest,
    x_internal_token: str | None = Header(None, alias="X-Internal-Token"),
):
    _verify_token(x_internal_token)
    t0 = time.time()

    if len(request.readings) < 6:
        return PredictResponse(
            status="insufficient_data",
            model_version=settings.model_version,
            detail=f"Minimum 6 readings required, got {len(request.readings)}.",
        )

    try:
        features, personal_features, missing_ratio = build_features(request)
        result = ensemble_model.predict(features, personal_features, request)
    except Exception as exc:
        logger.exception("Prediction failed")
        return PredictResponse(
            status="error",
            model_version=settings.model_version,
            detail=str(exc),
        )

    runtime_ms = int((time.time() - t0) * 1000)
    result.runtime_ms = runtime_ms
    result.input_readings_count = len(request.readings)
    result.missing_ratio = missing_ratio
    result.model_version = settings.model_version

    return result
