from django.conf import settings
from django.db import models


class UserWidget(models.Model):
    """
    Widgets activés pour un utilisateur.
    Table: user_widgets
    """

    SIZE_CHOICES = [
        ("compact", "Compact"),
        ("normal", "Normal"),
        ("expanded", "Expanded"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="widgets"
    )
    widget_id = models.CharField(max_length=50)
    visible = models.BooleanField(default=True)
    refresh_interval = models.IntegerField(default=300, help_text="Refresh interval in seconds")
    last_refreshed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "user_widgets"
        unique_together = ("user", "widget_id")

    def __str__(self):
        return f"{self.user.email} - {self.widget_id}"


class UserWidgetLayout(models.Model):
    """
    Position et taille des widgets pour un utilisateur.
    Table: user_widget_layouts
    """

    SIZE_CHOICES = [
        ("compact", "Compact"),
        ("normal", "Normal"),
        ("expanded", "Expanded"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="widget_layouts"
    )
    widget_id = models.CharField(max_length=50)
    column = models.IntegerField(default=0)
    row = models.IntegerField(default=0)
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, default="normal")
    pinned = models.BooleanField(default=False)

    class Meta:
        db_table = "user_widget_layouts"
        unique_together = ("user", "widget_id")

    def __str__(self):
        return f"{self.user.email} - {self.widget_id} ({self.column}, {self.row})"
