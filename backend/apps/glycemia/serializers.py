from rest_framework import serializers

from .models import Glycemia, GlycemiaDataIA, GlycemiaHisto


class GlycemiaSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Glycemia
        fields = [
            "user_email",
            "device",
            "measured_at",
            "value",
            "unit",
            "trend",
            "rate",
            "source",
        ]
        read_only_fields = ["user_email"]


class GlycemiaHistoSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlycemiaHisto
        fields = [
            "id",
            "reading_id",
            "device",
            "measured_at",
            "recorded_at",
            "value",
            "unit",
            "trend",
            "rate",
            "source",
            "context",
            "notes",
            "photo_url",
            "location_lat",
            "location_lng",
        ]
        read_only_fields = ["id", "reading_id", "recorded_at"]


class GlycemiaHistoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlycemiaHisto
        fields = [
            "measured_at",
            "value",
            "unit",
            "context",
            "notes",
            "photo_url",
            "location_lat",
            "location_lng",
        ]

    def validate_value(self, value):
        if value < 20 or value > 600:
            raise serializers.ValidationError(
                "Glucose value must be between 20 and 600 mg/dL"
            )
        return value


class GlycemiaDataIASerializer(serializers.ModelSerializer):
    class Meta:
        model = GlycemiaDataIA
        fields = [
            "id",
            "device",
            "for_time",
            "input_start",
            "input_end",
            "created_at",
            # Métadonnées du modèle
            "model_version",
            "source",
            "status",
            "runtime_ms",
            "confidence",
            # Audit données d'entrée
            "input_readings_count",
            "missing_ratio",
            "features_hash",
            # Horizon 15 min
            "y_hat_15",
            "p10_15",
            "p90_15",
            "risk_hypo_15",
            "risk_hyper_15",
            # Horizon 30 min
            "y_hat_30",
            "p10_30",
            "p90_30",
            "risk_hypo_30",
            "risk_hyper_30",
            # Horizon 60 min
            "y_hat_60",
            "p10_60",
            "p90_60",
            "risk_hypo_60",
            "risk_hyper_60",
            # Sortie
            "recommendation",
            "meta_json",
        ]
        read_only_fields = ["id", "created_at"]
