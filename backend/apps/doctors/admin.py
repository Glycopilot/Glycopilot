from django.contrib import admin

from .models import Doctor


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Doctor."""

    list_display = ("licence_number", "user", "valide", "valide_par")
    list_filter = ("valide",)
    search_fields = (
        "licence_number",
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
    )
    raw_id_fields = ("user", "valide_par")
    readonly_fields = ("licence_number",)
