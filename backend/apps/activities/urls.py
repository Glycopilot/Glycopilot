from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import ActivityViewSet, UserActivityViewSet

router = DefaultRouter()
router.register(r"types", ActivityViewSet, basename="activity-types")
router.register(r"history", UserActivityViewSet, basename="user-activity")

urlpatterns = [
    path("", include(router.urls)),
]
