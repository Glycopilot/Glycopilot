from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ReadingInput(BaseModel):
    measured_at: datetime
    value: float = Field(..., ge=20.0, le=600.0)
    trend: Optional[str] = None
    rate: Optional[float] = None
    context: Optional[str] = None


class WearableInput(BaseModel):
    hr_mean: Optional[float] = None
    hr_std: Optional[float] = None
    hrv_rmssd: Optional[float] = None
    temp_mean: Optional[float] = None


class PatientMeta(BaseModel):
    hba1c: Optional[float] = None
    gender_is_female: Optional[int] = Field(None, ge=0, le=1)


class PredictRequest(BaseModel):
    user_id: str
    for_time: datetime
    readings: list[ReadingInput] = Field(..., min_length=6, max_length=100)
    wearable: Optional[WearableInput] = None
    patient_meta: Optional[PatientMeta] = None

    @field_validator("readings")
    @classmethod
    def readings_must_be_sorted(cls, v: list[ReadingInput]) -> list[ReadingInput]:
        return sorted(v, key=lambda r: r.measured_at)


class HorizonPrediction(BaseModel):
    y_hat: float
    p10: float
    p90: float
    risk_hypo: float = Field(..., ge=0.0, le=1.0)
    risk_hyper: float = Field(..., ge=0.0, le=1.0)


class Predictions(BaseModel):
    horizon_15: Optional[HorizonPrediction] = None
    horizon_30: Optional[HorizonPrediction] = None
    horizon_60: Optional[HorizonPrediction] = None


class SubModelResult(BaseModel):
    y_hat_30: Optional[float] = None
    confidence: Optional[float] = None


class PredictResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    status: str
    model_version: str
    source: Optional[str] = None
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    runtime_ms: Optional[int] = None
    input_readings_count: Optional[int] = None
    missing_ratio: Optional[float] = None
    predictions: Optional[Predictions] = None
    recommendation: Optional[str] = None
    recommendation_level: Optional[str] = None
    sub_models: Optional[dict[str, SubModelResult]] = None
    detail: Optional[str] = None


class ModelInfo(BaseModel):
    name: str
    version: str
    loaded: bool
    artifact_path: str
    val_mae_30: Optional[float] = None


class ModelsResponse(BaseModel):
    models: list[ModelInfo]


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    status: str
    models_loaded: dict[str, bool]
    model_version: str
    uptime_seconds: Optional[int] = None
