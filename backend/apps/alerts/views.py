from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AlertEvent, UserAlertRule
from .serializers import AckSerializer, AlertEventSerializer, UserAlertRuleSerializer
from .services.trigger import ack_event


class UserAlertRuleListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserAlertRuleSerializer

    def get_queryset(self):
        return UserAlertRule.objects.select_related("rule").filter(
            user=self.request.user
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserAlertRuleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserAlertRuleSerializer

    def get_queryset(self):
        return UserAlertRule.objects.select_related("rule").filter(
            user=self.request.user
        )


class InAppAlertEventListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AlertEventSerializer

    def get_queryset(self):
        return (
            AlertEvent.objects.select_related("rule")
            .filter(user=self.request.user)
            .order_by("-triggered_at")
        )


class AckAlertEventView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        s = AckSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        event = ack_event(user=request.user, event_id=s.validated_data["event_id"])
        return Response(AlertEventSerializer(event).data, status=status.HTTP_200_OK)
