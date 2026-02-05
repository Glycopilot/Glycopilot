from django.contrib import admin

from .models import Meal, UserMeal


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Meal."""

    list_display = ("name", "glucose", "calories")
    list_filter = ("glucose", "calories")
    search_fields = ("name", "ingredients")
    ordering = ("name",)


@admin.register(UserMeal)
class UserMealAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour UserMeal."""

    list_display = ("user", "meal", "taken_at")
    list_filter = ("meal", "taken_at")
    search_fields = ("user__username", "user__email", "meal__name")
    raw_id_fields = ("user", "meal")
    date_hierarchy = "taken_at"
