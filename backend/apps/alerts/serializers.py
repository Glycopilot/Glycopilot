from rest_framework import serializers
from .models import AlertRule, UserAlertRule, AlertEvent

class AlertRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertRule
        fields = '__all__'

class UserAlertRuleSerializer(serializers.ModelSerializer):
    rule_details = AlertRuleSerializer(source='rule', read_only=True)
    rule_id = serializers.PrimaryKeyRelatedField(
        queryset=AlertRule.objects.all(), source='rule', write_only=True
    )
    
    class Meta:
        model = UserAlertRule
        fields = [
            'id', 'user', 'rule', 'rule_id', 'rule_details', 
            'enabled', 'min_glycemia_override', 'max_glycemia_override', 'cooldown_seconds'
        ]
        read_only_fields = ['user']

class AlertEventSerializer(serializers.ModelSerializer):
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    
    class Meta:
        model = AlertEvent
        fields = [
            'id', 'user', 'rule', 'rule_name', 'glycemia_value', 'triggered_at',
            'status', 'error_message'
        ]
        read_only_fields = ['user', 'triggered_at']
