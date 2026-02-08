"""
WebSocket URL routing for glycemia app.
"""

from django.urls import path

from .consumers import GlycemiaConsumer

websocket_urlpatterns = [
    path("ws/glycemia/", GlycemiaConsumer.as_asgi()),
]
