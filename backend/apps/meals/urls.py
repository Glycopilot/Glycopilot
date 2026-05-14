from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.routers import DefaultRouter

from .serializers import MealSerializer
from .views import MealViewSet, UserMealViewSet

router = DefaultRouter()
router.register(r"reference", MealViewSet, basename="meals-reference")
router.register(r"log", UserMealViewSet, basename="meals-log")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_meal_reference(request):
    serializer = MealSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


urlpatterns = [
    # Vue explicite HORS du namespace reference/ pour éviter tout conflit router
    path("add-meal-ref/", create_meal_reference, name="meal-reference-save"),
    # Routes générées automatiquement
    path("", include(router.urls)),
]
