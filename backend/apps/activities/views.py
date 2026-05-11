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

    def _resolve_user(self):
        user_id = self.request.query_params.get("user_id")
        if user_id and self.request.auth == "service_token":
            from apps.users.models import User

            try:
                return User.objects.get(id_user=user_id).auth_account
            except User.DoesNotExist:
                from rest_framework.exceptions import NotFound

                raise NotFound(f"Utilisateur {user_id} introuvable.")
        return self.request.user

    def get_queryset(self):
        return UserActivity.objects.filter(user=self._resolve_user()).order_by("-start")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
