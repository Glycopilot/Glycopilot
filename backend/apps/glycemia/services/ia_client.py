"""
HTTP client for the Glycopilot AI microservice (port 8001).

Call `request_prediction(instance)` after a new GlycemiaHisto is saved.
It fetches the last N readings for the user, POSTs to /predict, and
persists the result as a GlycemiaDataIA row.
"""

import logging
import urllib.request
import urllib.error
import json
from datetime import timezone

from django.conf import settings
from django.utils import timezone as django_timezone

logger = logging.getLogger(__name__)

AI_SERVICE_URL = getattr(settings, "AI_SERVICE_URL", "http://localhost:8001")
AI_SERVICE_TOKEN = getattr(settings, "AI_SERVICE_TOKEN", "dev_secret")
READINGS_WINDOW = 24  # number of recent readings to send


def _fetch_recent_readings(user, anchor_dt):
    """Return up to READINGS_WINDOW GlycemiaHisto rows before anchor_dt."""
    from apps.glycemia.models import GlycemiaHisto

    return list(
        GlycemiaHisto.objects.filter(user=user, measured_at__lte=anchor_dt)
        .order_by("-measured_at")
        .values("measured_at", "value", "trend", "rate", "context")[:READINGS_WINDOW]
    )


def _build_payload(user, instance, readings):
    """Build the JSON dict matching PredictRequest schema."""
    return {
        "user_id": str(user.id_auth),
        "for_time": instance.measured_at.astimezone(timezone.utc).isoformat(),
        "readings": [
            {
                "measured_at": r["measured_at"].astimezone(timezone.utc).isoformat(),
                "value": r["value"],
                "trend": r["trend"] or None,
                "rate": r["rate"],
                "context": r["context"] or None,
            }
            for r in readings
        ],
    }


def _post_predict(payload: dict) -> dict:
    """POST payload to AI service; returns parsed JSON response."""
    url = f"{AI_SERVICE_URL}/predict"
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Internal-Token": AI_SERVICE_TOKEN,
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _persist_prediction(user, instance, response: dict):
    """Create or update GlycemiaDataIA from AI service response."""
    from apps.glycemia.models import GlycemiaDataIA, PredictionStatus

    preds = response.get("predictions") or {}
    h15 = preds.get("horizon_15") or {}
    h30 = preds.get("horizon_30") or {}
    h60 = preds.get("horizon_60") or {}

    status_map = {
        "ok": PredictionStatus.OK,
        "low_confidence": PredictionStatus.LOW_CONFIDENCE,
        "insufficient_data": PredictionStatus.INSUFFICIENT_DATA,
        "error": PredictionStatus.ERROR,
    }
    status = status_map.get(response.get("status", "ok"), PredictionStatus.OK)

    readings = _fetch_recent_readings(user, instance.measured_at)
    input_start = readings[-1]["measured_at"] if readings else instance.measured_at
    input_end = readings[0]["measured_at"] if readings else instance.measured_at

    GlycemiaDataIA.objects.update_or_create(
        user=user,
        for_time=instance.measured_at,
        model_version=response.get("model_version", "unknown"),
        defaults={
            "device": instance.device,
            "input_start": input_start,
            "input_end": input_end,
            "source": response.get("source", "baseline"),
            "status": status,
            "runtime_ms": response.get("runtime_ms"),
            "confidence": response.get("confidence"),
            "input_readings_count": response.get("input_readings_count"),
            "missing_ratio": response.get("missing_ratio"),
            "y_hat_15": h15.get("y_hat"),
            "p10_15": h15.get("p10"),
            "p90_15": h15.get("p90"),
            "risk_hypo_15": h15.get("risk_hypo"),
            "risk_hyper_15": h15.get("risk_hyper"),
            "y_hat_30": h30.get("y_hat"),
            "p10_30": h30.get("p10"),
            "p90_30": h30.get("p90"),
            "risk_hypo_30": h30.get("risk_hypo"),
            "risk_hyper_30": h30.get("risk_hyper"),
            "y_hat_60": h60.get("y_hat"),
            "p10_60": h60.get("p10"),
            "p90_60": h60.get("p90"),
            "risk_hypo_60": h60.get("risk_hypo"),
            "risk_hyper_60": h60.get("risk_hyper"),
            "recommendation": response.get("recommendation"),
            "meta_json": {
                "recommendation_level": response.get("recommendation_level"),
                "sub_models": response.get("sub_models"),
            },
        },
    )


def request_prediction(instance) -> None:
    """
    Main entry point called from signals.py.
    Fetches recent readings, calls AI service, persists result.
    Errors are logged but never raised (fire-and-forget).
    """
    user = instance.user
    readings = _fetch_recent_readings(user, instance.measured_at)

    if len(readings) < 6:
        logger.debug(
            "Skipping AI prediction for user %s: only %d readings available (need 6+)",
            user.id_auth,
            len(readings),
        )
        return

    try:
        payload = _build_payload(user, instance, readings)
        response = _post_predict(payload)
        _persist_prediction(user, instance, response)
        logger.info(
            "AI prediction saved for user %s @ %s (source=%s)",
            user.id_auth,
            instance.measured_at,
            response.get("source", "?"),
        )
    except urllib.error.URLError as exc:
        logger.warning("AI service unreachable for user %s: %s", user.id_auth, exc)
    except Exception as exc:
        logger.error(
            "Unexpected error during AI prediction for user %s: %s",
            user.id_auth,
            exc,
            exc_info=True,
        )
