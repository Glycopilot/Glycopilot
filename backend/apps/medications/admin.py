from django.contrib import admin

from .models import Medication, UserMedication


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Medication."""

    list_display = ("name", "type", "dosage", "interval_h", "max_duration_d")
    list_filter = ("type",)
    search_fields = ("name", "type")
    ordering = ("name",)


@admin.register(UserMedication)
class UserMedicationAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour UserMedication."""

    list_display = ("user", "medication", "start_date", "taken_at", "statut")
    list_filter = ("statut", "medication", "start_date")
    search_fields = ("user__username", "user__email", "medication__name")
    raw_id_fields = ("user", "medication")
    date_hierarchy = "start_date"
