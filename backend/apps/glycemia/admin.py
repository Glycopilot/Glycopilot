from django.contrib import admin

from .models import Glycemia, GlycemiaDataIA, GlycemiaHisto


@admin.register(Glycemia)
class GlycemiaAdmin(admin.ModelAdmin):
    list_display = ("user", "value", "measured_at")
    list_filter = ("measured_at",)
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)
    date_hierarchy = "measured_at"


@admin.register(GlycemiaHisto)
class GlycemiaHistoAdmin(admin.ModelAdmin):
    list_display = ("user", "value", "measured_at")
    list_filter = ("measured_at",)
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)
    date_hierarchy = "measured_at"
    list_per_page = 50


@admin.register(GlycemiaDataIA)
class GlycemiaDataIAAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "for_time",
        "input_start",
        "input_end",
        "risk_hypo_15",
        "risk_hyper_15",
    )
    list_filter = ("for_time", "status", "source")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user", "device")
    date_hierarchy = "for_time"
    list_per_page = 50
