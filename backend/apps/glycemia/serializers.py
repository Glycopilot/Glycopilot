from rest_framework import serializers

from .models import Glycemia, GlycemiaDataIA, GlycemiaHisto


class GlycemiaSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Glycemia
        fields = [
            "user_email",
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
            "created_at",
            "prediction_start",
            "prediction_end",
            "prob_hypo",
            "prob_hyper",
            "recommendation",
            "model_version",
        ]
        read_only_fields = ["id", "created_at"]
