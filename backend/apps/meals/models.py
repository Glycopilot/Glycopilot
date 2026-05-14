from django.conf import settings
from django.db import models


class Meal(models.Model):
    SOURCE_MANUAL = "manual"
    SOURCE_OPENFOOD = "openfood"
    SOURCE_CHOICES = [
        (SOURCE_MANUAL, "Manuel"),
        (SOURCE_OPENFOOD, "Open Food Facts"),
    ]

    meal_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=150)
    ingredients = models.TextField(blank=True, null=True)
    recipe = models.TextField(blank=True, null=True)
    glucose = models.FloatField(blank=True, null=True)
    calories = models.IntegerField(blank=True, null=True)
    glucides = models.FloatField(blank=True, null=True)
    proteines = models.FloatField(blank=True, null=True)
    lipides = models.FloatField(blank=True, null=True)
    link_photo = models.URLField(blank=True, null=True)
    barcode = models.CharField(max_length=30, blank=True, null=True, unique=True)
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default=SOURCE_MANUAL)

    class Meta:
        db_table = "meals"


class UserMeal(models.Model):
    MEAL_TYPE_CHOICES = [
        ("breakfast", "Petit-déjeuner"),
        ("lunch", "Déjeuner"),
        ("snack", "Collation"),
        ("dinner", "Dîner"),
    ]
    INPUT_MODE_CHOICES = [
        ("manual", "Manuel"),
        ("barcode", "Code-barres"),
        ("search", "Recherche"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="user_meals"
    )
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name="user_meals")
    taken_at = models.DateTimeField()
    meal_type = models.CharField(max_length=15, choices=MEAL_TYPE_CHOICES, default="lunch")
    portion_g = models.FloatField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    input_mode = models.CharField(max_length=10, choices=INPUT_MODE_CHOICES, default="manual")
    session_key = models.CharField(max_length=40, blank=True, null=True)

    class Meta:
        db_table = "users_meals"
