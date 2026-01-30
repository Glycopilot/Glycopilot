from django.apps import AppConfig


class GlycemiaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.glycemia"

    def ready(self):
        """Register signals when the app is ready."""
        from . import signals  # noqa: F401
