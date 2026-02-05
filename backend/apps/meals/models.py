from django.conf import settings
from django.db import models


class Meal(models.Model):
    meal_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    ingredients = models.TextField(blank=True, null=True)
    recipe = models.TextField(blank=True, null=True)
    glucose = models.FloatField(blank=True, null=True)
    calories = models.IntegerField(blank=True, null=True)
    link_photo = models.URLField(blank=True, null=True)

    class Meta:
        db_table = "meals"


class UserMeal(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_meals"
    )
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name="user_meals")
    taken_at = models.DateTimeField()

    class Meta:
        db_table = "users_meals"
        unique_together = ("user", "meal", "taken_at")
