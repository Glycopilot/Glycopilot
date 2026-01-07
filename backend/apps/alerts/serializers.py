from rest_framework import serializers

from .models import AlertEvent, AlertRule, UserAlertRule


class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = (
            "id",
            "code",
            "name",
            "description",
            "min_glycemia",
            "max_glycemia",
            "severity",
            "is_active",
        )


class UserAlertRuleSerializer(serializers.ModelSerializer):
    rule = AlertRuleSerializer(read_only=True)
    rule_id = serializers.PrimaryKeyRelatedField(
        source="rule", queryset=AlertRule.objects.all(), write_only=True
    )

    class Meta:
        model = UserAlertRule
        fields = (
            "id",
            "rule",
            "rule_id",
            "enabled",
            "min_glycemia_override",
            "max_glycemia_override",
            "cooldown_seconds",
        )


class AlertEventSerializer(serializers.ModelSerializer):
    rule = AlertRuleSerializer(read_only=True)

    class Meta:
        model = AlertEvent
        fields = (
            "id",
            "rule",
            "glycemia_value",
            "status",
            "triggered_at",
            "inapp_created_at",
            "push_sent_at",
            "acked_at",
            "resolved_at",
            "error_message",
        )


class AckSerializer(serializers.Serializer):
    event_id = serializers.IntegerField(min_value=1)
