"""URL configuration for notifications app."""

from django.urls import path

from .views import PushTokenView

urlpatterns = [
    path("push-token/", PushTokenView.as_view(), name="push-token"),
]
