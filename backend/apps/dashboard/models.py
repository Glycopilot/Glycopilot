from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models


class WidgetSize(models.TextChoices):
    COMPACT = "compact", "Compact"
    NORMAL = "normal", "Normal"
    EXPANDED = "expanded", "Expanded"


class UserWidget(models.Model):
    """
    Liste des widgets activés pour un utilisateur.
    Table: USER_WIDGETS
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="dashboard_widgets",
    )
    widget_id = models.CharField(max_length=50)
    visible = models.BooleanField(default=True)
    refresh_interval = models.PositiveIntegerField(
        default=300, help_text="Refresh interval in seconds"
    )
    last_refreshed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_widgets"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "widget_id"], name="uniq_user_widget"
            )
        ]
        indexes = [
            models.Index(fields=["user", "visible"]),
        ]

    def __str__(self):
        return f"{self.user} - {self.widget_id}"


class UserWidgetLayout(models.Model):
    """
    Position et taille des widgets pour un utilisateur.
    Table: USER_WIDGET_LAYOUTS
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="widget_layouts",
    )
    widget_id = models.CharField(max_length=50)
    column = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    row = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
    size = models.CharField(
        max_length=20, choices=WidgetSize.choices, default=WidgetSize.NORMAL
    )
    pinned = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_widget_layouts"
        constraints = [
            models.UniqueConstraint(
                fields=["user", "widget_id"], name="uniq_user_widget_layout"
            )
        ]
        indexes = [
            models.Index(fields=["user", "column", "row"]),
        ]

    def __str__(self):
        return f"{self.user} - {self.widget_id} @ ({self.column}, {self.row})"
