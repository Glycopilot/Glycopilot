from django.contrib import admin

from .models import Glycemia, GlycemiaDataIA, GlycemiaHisto


@admin.register(Glycemia)
class GlycemiaAdmin(admin.ModelAdmin):
    list_display = ("user", "value", "measured_at")
    list_filter = ("measured_at",)
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user", "device")
    date_hierarchy = "measured_at"


@admin.register(GlycemiaHisto)
class GlycemiaHistoAdmin(admin.ModelAdmin):
    list_display = ("user", "value", "measured_at")
    list_filter = ("measured_at",)
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user", "device")
    date_hierarchy = "measured_at"
    list_per_page = 50


@admin.register(GlycemiaDataIA)
class GlycemiaDataIAAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "for_time",
        "model_version",
        "source",
        "status",
        "y_hat_15",
        "y_hat_30",
        "y_hat_60",
        "confidence",
    )
    list_filter = ("source", "status", "model_version")
    search_fields = ("user__username", "user__email")
    raw_id_fields = ("user", "device")
    date_hierarchy = "for_time"
    list_per_page = 50
    readonly_fields = ("created_at",)

    fieldsets = (
        ("Liens", {
            "fields": ("user", "device"),
        }),
        ("Temps", {
            "fields": ("for_time", "input_start", "input_end", "created_at"),
        }),
        ("Info modèle", {
            "fields": ("model_version", "source", "status", "runtime_ms", "confidence"),
        }),
        ("Audit entrée", {
            "fields": ("input_readings_count", "missing_ratio", "features_hash"),
        }),
        ("Prédictions (15 min)", {
            "fields": ("y_hat_15", "p10_15", "p90_15", "risk_hypo_15", "risk_hyper_15"),
        }),
        ("Prédictions (30 min)", {
            "fields": ("y_hat_30", "p10_30", "p90_30", "risk_hypo_30", "risk_hyper_30"),
        }),
        ("Prédictions (60 min)", {
            "fields": ("y_hat_60", "p10_60", "p90_60", "risk_hypo_60", "risk_hyper_60"),
        }),
        ("Sortie", {
            "fields": ("recommendation", "meta_json"),
        }),
    )
