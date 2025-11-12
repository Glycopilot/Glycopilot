from django.contrib import admin
from .models import Medication

@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "dose", "frequency", "start_date", "end_date")
