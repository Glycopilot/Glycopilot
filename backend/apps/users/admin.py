from django.contrib import admin
from .models import User

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "is_doctor", "is_patient", "is_active")
    search_fields = ("email",)
