from django.contrib.auth import get_user_model
from django.utils import timezone

import pytest

from apps.glycemia.models import GlycemiaDataIA, GlycemiaHisto, PredictionStatus
from apps.glycemia.serializers import (
    GlycemiaDataIASerializer,
    GlycemiaHistoSerializer,
    GlycemiaSerializer,
)

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(email="gly-ser@test.com", password="pass123")


@pytest.mark.django_db
class TestGlycemiaHistoSerializer:
    def test_serializes_all_expected_fields(self, user):
        histo = GlycemiaHisto.objects.create(
            user=user,
            measured_at=timezone.now(),
            value=110.0,
            unit="mg/dL",
            source="manual",
            context="fasting",
        )
        data = GlycemiaHistoSerializer(histo).data
        assert data["value"] == 110.0
        assert data["unit"] == "mg/dL"
        assert data["source"] == "manual"
        assert data["context"] == "fasting"

    def test_value_is_required_on_write(self, user):
        serializer = GlycemiaHistoSerializer(
            data={"measured_at": timezone.now().isoformat(), "unit": "mg/dL"}
        )
        assert not serializer.is_valid()
        assert "value" in serializer.errors

    def test_valid_data_is_valid(self, user):
        serializer = GlycemiaHistoSerializer(
            data={
                "measured_at": timezone.now().isoformat(),
                "value": 95.5,
                "unit": "mg/dL",
                "source": "manual",
            }
        )
        assert serializer.is_valid(), serializer.errors


@pytest.mark.django_db
class TestGlycemiaDataIASerializer:
    def test_serializes_prediction_fields(self, user):
        pred = GlycemiaDataIA.objects.create(
            user=user,
            for_time=timezone.now(),
            input_start=timezone.now(),
            input_end=timezone.now(),
            model_version="v1",
            source="baseline",
            status=PredictionStatus.OK,
            y_hat_15=108.0,
            y_hat_30=115.0,
            y_hat_60=120.0,
        )
        data = GlycemiaDataIASerializer(pred).data
        assert data["y_hat_15"] == 108.0
        assert data["status"] == PredictionStatus.OK
        assert data["source"] == "baseline"
