from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MealViewSet, UserMealViewSet

router = DefaultRouter()
router.register(r'reference', MealViewSet, basename='meals-reference')
router.register(r'log', UserMealViewSet, basename='meals-log')

urlpatterns = [
    path('', include(router.urls)),
]
