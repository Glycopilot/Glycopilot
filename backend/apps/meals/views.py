from rest_framework import permissions, viewsets

from .models import Meal, UserMeal
from .serializers import MealSerializer, UserMealSerializer


class MealViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnly ViewSet for reference meals data.
    """

    queryset = Meal.objects.all()
    serializer_class = MealSerializer
    permission_classes = [permissions.IsAuthenticated]


class UserMealViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for user's meals.
    Automatically filters by current user.
    """

    serializer_class = UserMealSerializer
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
        return UserMeal.objects.filter(user=self._resolve_user()).order_by("-taken_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
