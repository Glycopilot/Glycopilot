from django.contrib import admin
from .models import Profile

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "age", "diabetes_type", "target_min", "target_max")
    search_fields = ("user__email",)
