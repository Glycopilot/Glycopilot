from django.conf import settings
from django.db import models


class Activity(models.Model):
    activity_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    recommended_duration = models.IntegerField(blank=True, null=True)
    calories_burned = models.IntegerField(blank=True, null=True)
    sugar_used = models.FloatField(blank=True, null=True)
    link_photo = models.URLField(blank=True, null=True)

    class Meta:
        db_table = "activities"


class UserActivity(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="user_activities",
    )
    activity = models.ForeignKey(
        Activity, on_delete=models.CASCADE, related_name="user_activities"
    )
    start = models.DateTimeField()
    end = models.DateTimeField()
    intensity = models.CharField(max_length=50, blank=True, null=True)

    class Meta:
        db_table = "user_activity"
        indexes = [models.Index(fields=["user", "start"])]


class UserStepDayCheckpoint(models.Model):
    """Dernier total de pas rapporté pour une journée (calendrier serveur)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="step_day_checkpoints",
    )
    day = models.DateField()
    last_reported_steps = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "user_step_day_checkpoint"
        constraints = [
            models.UniqueConstraint(fields=["user", "day"], name="uniq_user_step_day")
        ]


class UserMilestonePoints(models.Model):
    """Points cumulés gagnés via les paliers de pas (hors Firebase)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="milestone_points",
    )
    total_points = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "user_milestone_points"
