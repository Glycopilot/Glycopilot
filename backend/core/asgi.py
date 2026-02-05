"""
ASGI config for core project.

Configures HTTP and WebSocket protocol routing with JWT authentication.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.conf import settings
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

# Initialize Django ASGI application early to ensure AppRegistry is populated
django_asgi_app = get_asgi_application()

# Import after Django setup to avoid AppRegistryNotReady
from apps.glycemia.middleware import JWTAuthMiddleware
from apps.glycemia.routing import websocket_urlpatterns

# Build WebSocket routing with JWT authentication
websocket_application = JWTAuthMiddleware(URLRouter(websocket_urlpatterns))

# In production, validate WebSocket origins against ALLOWED_HOSTS
# In development, allow all origins for easier testing
if not settings.DEBUG:
    websocket_application = AllowedHostsOriginValidator(websocket_application)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": websocket_application,
})
