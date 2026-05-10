from django.contrib import admin

from .models import Medication, MedicationIntake, MedicationSchedule, UserMedication


@admin.register(Medication)
class MedicationAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "dosage", "interval_h", "max_duration_d", "cis_code")
    list_filter = ("type",)
    search_fields = ("name", "type", "cis_code")
    ordering = ("name",)


@admin.register(UserMedication)
class UserMedicationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "display_name",
        "source",
        "start_date",
        "end_date",
        "doses_per_day",
        "meal_timing",
        "statut",
    )
    list_filter = ("statut", "source", "meal_timing", "start_date")
    search_fields = ("user__username", "user__email", "medication__name", "custom_name")
    raw_id_fields = ("user", "medication")
    date_hierarchy = "start_date"


@admin.register(MedicationSchedule)
class MedicationScheduleAdmin(admin.ModelAdmin):
    list_display = ("user_medication", "time", "reminder_enabled")
    list_filter = ("reminder_enabled",)
    raw_id_fields = ("user_medication",)


@admin.register(MedicationIntake)
class MedicationIntakeAdmin(admin.ModelAdmin):
    list_display = (
        "user_medication",
        "scheduled_date",
        "scheduled_time",
        "status",
        "taken_at",
        "snoozed_until",
    )
    list_filter = ("status", "scheduled_date")
    search_fields = ("user_medication__medication__name", "user_medication__custom_name")
    raw_id_fields = ("user_medication", "schedule")
    date_hierarchy = "scheduled_date"
