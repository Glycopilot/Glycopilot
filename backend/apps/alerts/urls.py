from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import AlertHistoryViewSet, AlertRuleViewSet, UserAlertSettingsViewSet

router = DefaultRouter()
router.register(r"rules", AlertRuleViewSet, basename="alert-rules")
router.register(r"settings", UserAlertSettingsViewSet, basename="alert-settings")
router.register(r"events", AlertHistoryViewSet, basename="alert-events")

urlpatterns = [
    path("", include(router.urls)),
]
