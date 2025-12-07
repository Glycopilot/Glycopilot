from rest_framework import serializers
from .models import UserWidget, UserWidgetLayout
from .services.widget_catalog import VALID_WIDGET_IDS, VALID_SIZES, MAX_WIDGETS, can_hide_widget


class UserWidgetSerializer(serializers.ModelSerializer):
    """Serializer pour les widgets utilisateur."""

    title = serializers.SerializerMethodField()
    lastUpdated = serializers.DateTimeField(source="last_refreshed_at", read_only=True)
    refreshInterval = serializers.IntegerField(source="refresh_interval")
    widgetId = serializers.CharField(source="widget_id")

    class Meta:
        model = UserWidget
        fields = ["widgetId", "title", "lastUpdated", "refreshInterval", "visible"]

    def get_title(self, obj):
        from .services.widget_catalog import get_widget_config
        config = get_widget_config(obj.widget_id)
        return config["title"] if config else obj.widget_id


class UserWidgetLayoutSerializer(serializers.ModelSerializer):
    """Serializer pour le layout des widgets."""

    widgetId = serializers.CharField(source="widget_id")

    class Meta:
        model = UserWidgetLayout
        fields = ["widgetId", "column", "row", "size", "pinned"]


class WidgetLayoutInputSerializer(serializers.Serializer):
    """Serializer pour la validation du layout en entrée."""

    widgetId = serializers.CharField()
    column = serializers.IntegerField(min_value=0)
    row = serializers.IntegerField(min_value=0)
    size = serializers.ChoiceField(choices=VALID_SIZES)
    pinned = serializers.BooleanField(default=False)

    def validate_widgetId(self, value):
        if value not in VALID_WIDGET_IDS:
            raise serializers.ValidationError(f"Widget ID invalide: {value}")
        return value


class LayoutUpdateSerializer(serializers.Serializer):
    """Serializer pour la mise à jour du layout complet."""

    layout = WidgetLayoutInputSerializer(many=True)

    def validate_layout(self, value):
        if len(value) > MAX_WIDGETS:
            raise serializers.ValidationError(
                f"Nombre maximum de widgets dépassé ({MAX_WIDGETS})"
            )

        # Vérifier les widgets obligatoires
        widget_ids = [w["widgetId"] for w in value]
        from .services.widget_catalog import REQUIRED_WIDGETS
        for required in REQUIRED_WIDGETS:
            if required not in widget_ids:
                raise serializers.ValidationError(
                    f"Le widget '{required}' est obligatoire et ne peut pas être supprimé"
                )

        # Vérifier les doublons
        if len(widget_ids) != len(set(widget_ids)):
            raise serializers.ValidationError("Widgets dupliqués détectés")

        # Vérifier les collisions de position
        positions = [(w["column"], w["row"]) for w in value]
        if len(positions) != len(set(positions)):
            raise serializers.ValidationError("Collision de positions détectée")

        return value


# Serializers pour les réponses du dashboard summary

class GlucoseSerializer(serializers.Serializer):
    """Serializer pour les données glycémie."""
    value = serializers.FloatField()
    unit = serializers.CharField()
    trend = serializers.CharField()
    recordedAt = serializers.CharField(allow_null=True)


class AlertSerializer(serializers.Serializer):
    """Serializer pour une alerte."""
    alertId = serializers.CharField()
    type = serializers.CharField()
    severity = serializers.CharField()


class NextDoseSerializer(serializers.Serializer):
    """Serializer pour la prochaine prise de médicament."""
    name = serializers.CharField()
    scheduledAt = serializers.CharField()
    status = serializers.CharField()


class MedicationSerializer(serializers.Serializer):
    """Serializer pour les données médicaments."""
    nextDose = NextDoseSerializer(allow_null=True)


class CaloriesSerializer(serializers.Serializer):
    """Serializer pour les calories."""
    consumed = serializers.IntegerField()
    goal = serializers.IntegerField()


class CarbsSerializer(serializers.Serializer):
    """Serializer pour les glucides."""
    grams = serializers.IntegerField()
    goal = serializers.IntegerField()


class NutritionSerializer(serializers.Serializer):
    """Serializer pour les données nutrition."""
    calories = CaloriesSerializer()
    carbs = CarbsSerializer()


class StepsSerializer(serializers.Serializer):
    """Serializer pour les pas."""
    value = serializers.IntegerField()
    goal = serializers.IntegerField()


class ActivitySerializer(serializers.Serializer):
    """Serializer pour les données activité."""
    steps = StepsSerializer()
    activeMinutes = serializers.IntegerField()


class DashboardSummarySerializer(serializers.Serializer):
    """Serializer pour la réponse complète du dashboard."""
    glucose = GlucoseSerializer(required=False)
    alerts = AlertSerializer(many=True, required=False)
    medication = MedicationSerializer(required=False)
    nutrition = NutritionSerializer(required=False)
    activity = ActivitySerializer(required=False)
    healthScore = serializers.IntegerField()
