from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import ActivityViewSet, UserActivityViewSet
from .views_steps import DailyStepsStateAPIView, DailyStepsSyncAPIView

router = DefaultRouter()
router.register(r"types", ActivityViewSet, basename="activity-types")
router.register(r"history", UserActivityViewSet, basename="user-activity")

urlpatterns = [
    path("steps/state/", DailyStepsStateAPIView.as_view(), name="steps-state"),
    path("steps/sync/", DailyStepsSyncAPIView.as_view(), name="steps-sync"),
    path("", include(router.urls)),
]
