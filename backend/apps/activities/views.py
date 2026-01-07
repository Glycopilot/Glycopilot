from rest_framework import permissions, viewsets

from .models import Activity, UserActivity
from .serializers import ActivitySerializer, UserActivitySerializer


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly ViewSet for reference activities.
    """

    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]


class UserActivityViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for user's activity log.
    Automatically filters by current user.
    """

    serializer_class = UserActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserActivity.objects.filter(user=self.request.user).order_by("-start")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
