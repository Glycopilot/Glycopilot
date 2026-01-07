from django.urls import path
from .views import (
    UserAlertRuleListCreateView,
    UserAlertRuleDetailView,
    InAppAlertEventListView,
    AckAlertEventView,
)

urlpatterns = [
    path("user-rules/", UserAlertRuleListCreateView.as_view(), name="alerts-user-rules-list"),
    path("user-rules/<int:pk>/", UserAlertRuleDetailView.as_view(), name="alerts-user-rules-detail"),
    path("events/", InAppAlertEventListView.as_view(), name="alerts-events-list"),
    path("events/ack/", AckAlertEventView.as_view(), name="alerts-events-ack"),
]
