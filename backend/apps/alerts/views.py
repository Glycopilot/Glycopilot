from rest_framework import viewsets, permissions
from .models import AlertRule, UserAlertRule, AlertEvent
from .serializers import AlertRuleSerializer, UserAlertRuleSerializer, AlertEventSerializer

class AlertRuleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly ViewSet for reference rules.
    """
    queryset = AlertRule.objects.filter(is_active=True)
    serializer_class = AlertRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

class UserAlertSettingsViewSet(viewsets.ModelViewSet):
    """
    Manage user preferences for alerts.
    """
    serializer_class = UserAlertRuleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserAlertRule.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class AlertHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only history of triggered alerts.
    """
    serializer_class = AlertEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AlertEvent.objects.filter(user=self.request.user).order_by("-triggered_at")
