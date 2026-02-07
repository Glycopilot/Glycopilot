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

    def get_queryset(self):
        return UserMeal.objects.filter(user=self.request.user).order_by("-taken_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
