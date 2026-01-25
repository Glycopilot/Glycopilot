from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AlertRuleViewSet, UserAlertSettingsViewSet, AlertHistoryViewSet

router = DefaultRouter()
router.register(r'rules', AlertRuleViewSet, basename='alert-rules')
router.register(r'settings', UserAlertSettingsViewSet, basename='alert-settings')
router.register(r'history', AlertHistoryViewSet, basename='alert-history')

urlpatterns = [
    path('', include(router.urls)),
]
