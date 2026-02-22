from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
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

    @action(detail=False, methods=['post'], url_path='treat')
    def treat(self, request):
        event_id = request.data.get("event_id")
        if not event_id:
            return Response({"error": "event_id required"}, status=400)
            
        try:
            event = AlertEvent.objects.get(id=event_id, user=request.user)
            event.status = "TREATING"
            # Optional: record treatment start time if field exists, otherwise just status updated_at
            event.save()
            return Response({"status": "treating"})
        except AlertEvent.DoesNotExist:
             return Response({"error": "Event not found"}, status=404)

    @action(detail=False, methods=['post'], url_path='ack')
    def ack(self, request):
        event_id = request.data.get("event_id")
        if not event_id:
            return Response({"error": "event_id required"}, status=400)
            
        try:
            event = AlertEvent.objects.get(id=event_id, user=request.user)
            event.acked_at = timezone.now()
            event.status = "ACKED"
            event.save()
            return Response({"status": "acked"})
        except AlertEvent.DoesNotExist:
             return Response({"error": "Event not found"}, status=404)

