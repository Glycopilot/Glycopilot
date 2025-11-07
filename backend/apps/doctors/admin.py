from django.contrib import admin
from .models import Doctor

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("user", "specialty", "phone", "hospital")
    search_fields = ("user__email", "specialty")
