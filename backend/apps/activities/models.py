from django.db import models
from django.conf import settings

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
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_activities")
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name="user_activities")
    start = models.DateTimeField()
    end = models.DateTimeField()

    class Meta:
        db_table = "user_activity"
        indexes = [models.Index(fields=["user","start"])]
