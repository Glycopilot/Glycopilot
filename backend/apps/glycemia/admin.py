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
        "prediction_start",
        "prediction_end",
        "prob_hypo",
        "prob_hyper",
    )
    list_filter = ("prediction_start", "prediction_end")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user",)
    date_hierarchy = "prediction_start"
    list_per_page = 50
