from rest_framework import serializers

from .models import UserWidget, UserWidgetLayout, WidgetSize
from .services import WidgetCatalog


class GlucoseSerializer(serializers.Serializer):
    value = serializers.FloatField()
    unit = serializers.CharField()
    trend = serializers.CharField(allow_null=True)
    recordedAt = serializers.DateTimeField()


class AlertSummarySerializer(serializers.Serializer):
    alertId = serializers.CharField()
    type = serializers.CharField()
    severity = serializers.CharField()


class MedicationNextDoseSerializer(serializers.Serializer):
    name = serializers.CharField()
    scheduledAt = serializers.DateTimeField()
    status = serializers.CharField()


class MedicationSummarySerializer(serializers.Serializer):
    nextDose = MedicationNextDoseSerializer(allow_null=True)
    taken_count = serializers.IntegerField()
    total_count = serializers.IntegerField()


class NutritionCaloriesSerializer(serializers.Serializer):
    consumed = serializers.IntegerField()
    goal = serializers.IntegerField()


class NutritionCarbsSerializer(serializers.Serializer):
    grams = serializers.IntegerField()
    goal = serializers.IntegerField()


class NutritionSummarySerializer(serializers.Serializer):
    calories = NutritionCaloriesSerializer()
    carbs = NutritionCarbsSerializer()


class ActivityStepsSerializer(serializers.Serializer):
    value = serializers.IntegerField()
    goal = serializers.IntegerField()


class ActivitySummarySerializer(serializers.Serializer):
    steps = ActivityStepsSerializer()
    activeMinutes = serializers.IntegerField()


class DashboardSummarySerializer(serializers.Serializer):
    glucose = GlucoseSerializer(allow_null=True)
    alerts = AlertSummarySerializer(many=True)
    medication = MedicationSummarySerializer()
    nutrition = NutritionSummarySerializer()
    activity = ActivitySummarySerializer()
    healthScore = serializers.IntegerField()


class WidgetSerializer(serializers.Serializer):
    widgetId = serializers.CharField()
    title = serializers.CharField()
    lastUpdated = serializers.DateTimeField(allow_null=True)
    refreshInterval = serializers.IntegerField()
    visible = serializers.BooleanField()


class WidgetListSerializer(serializers.Serializer):
    widgets = WidgetSerializer(many=True)


class WidgetLayoutItemSerializer(serializers.Serializer):
    widgetId = serializers.CharField()
    column = serializers.IntegerField(min_value=0)
    row = serializers.IntegerField(min_value=0)
    size = serializers.ChoiceField(choices=["compact", "normal", "expanded"])
    pinned = serializers.BooleanField(default=False)

    def validate_widgetId(self, value):
        if not WidgetCatalog.widget_exists(value):
            raise serializers.ValidationError(
                f"Widget '{value}' does not exist in catalog"
            )
        return value

    def validate(self, data):
        widget_id = data.get("widgetId")
        size = data.get("size")

        if widget_id and size:
            if not WidgetCatalog.is_valid_size(widget_id, size):
                widget = WidgetCatalog.get_widget(widget_id)
                raise serializers.ValidationError(
                    f"Size '{size}' is not allowed for widget '{widget_id}'. "
                    f"Allowed: {widget.allowed_sizes}"
                )
        return data


class WidgetLayoutUpdateSerializer(serializers.Serializer):
    layout = WidgetLayoutItemSerializer(many=True)

    def validate_layout(self, value):
        if len(value) > WidgetCatalog.MAX_WIDGETS:
            raise serializers.ValidationError(
                f"Maximum {WidgetCatalog.MAX_WIDGETS} widgets allowed"
            )

        widget_ids = [item["widgetId"] for item in value]
        if len(widget_ids) != len(set(widget_ids)):
            raise serializers.ValidationError("Duplicate widget IDs in layout")

        non_hideable = WidgetCatalog.get_non_hideable_widgets()
        for widget_id in non_hideable:
            if widget_id not in widget_ids:
                raise serializers.ValidationError(
                    f"Widget '{widget_id}' cannot be hidden and must be in layout"
                )

        return value


class WidgetLayoutResponseSerializer(serializers.Serializer):
    layout = WidgetLayoutItemSerializer(many=True)
    updatedAt = serializers.DateTimeField()
