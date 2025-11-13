from django.contrib import admin

from .models import Glycemia, GlycemiaDataIA, GlycemiaHisto


@admin.register(Glycemia)
class GlycemiaAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Glycemia."""

    list_display = ("user", "value", "measured_at")
    list_filter = ("measured_at",)
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)
    date_hierarchy = "measured_at"


@admin.register(GlycemiaHisto)
class GlycemiaHistoAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour GlycemiaHisto."""

    list_display = ("user", "value", "measured_at")
    list_filter = ("measured_at",)
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)
    date_hierarchy = "measured_at"
    list_per_page = 50


@admin.register(GlycemiaDataIA)
class GlycemiaDataIAAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour GlycemiaDataIA."""

    list_display = ("user", "value", "measured_at")
    list_filter = ("measured_at",)
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)
    date_hierarchy = "measured_at"
    list_per_page = 50
