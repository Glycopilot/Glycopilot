from django.contrib import admin
from django.utils import timezone

import requests

from .models import Glycemia, GlycemiaDataIA, GlycemiaHisto, PersonalModelApproval


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
        (
            "Liens",
            {
                "fields": ("user", "device"),
            },
        ),
        (
            "Temps",
            {
                "fields": ("for_time", "input_start", "input_end", "created_at"),
            },
        ),
        (
            "Info modèle",
            {
                "fields": (
                    "model_version",
                    "source",
                    "status",
                    "runtime_ms",
                    "confidence",
                ),
            },
        ),
        (
            "Audit entrée",
            {
                "fields": ("input_readings_count", "missing_ratio", "features_hash"),
            },
        ),
        (
            "Prédictions (15 min)",
            {
                "fields": (
                    "y_hat_15",
                    "p10_15",
                    "p90_15",
                    "risk_hypo_15",
                    "risk_hyper_15",
                ),
            },
        ),
        (
            "Prédictions (30 min)",
            {
                "fields": (
                    "y_hat_30",
                    "p10_30",
                    "p90_30",
                    "risk_hypo_30",
                    "risk_hyper_30",
                ),
            },
        ),
        (
            "Prédictions (60 min)",
            {
                "fields": (
                    "y_hat_60",
                    "p10_60",
                    "p90_60",
                    "risk_hypo_60",
                    "risk_hyper_60",
                ),
            },
        ),
        (
            "Sortie",
            {
                "fields": ("recommendation", "meta_json"),
            },
        ),
    )


def _call_ai_service(path: str, method: str = "POST") -> None:
    from django.conf import settings as django_settings

    ai_url = getattr(django_settings, "AI_SERVICE_URL", "http://localhost:8001")
    ai_token = getattr(django_settings, "AI_SERVICE_TOKEN", "")
    requests.request(
        method,
        f"{ai_url}{path}",
        headers={"X-Internal-Token": ai_token},
        timeout=10,
    ).raise_for_status()


@admin.register(PersonalModelApproval)
class PersonalModelApprovalAdmin(admin.ModelAdmin):
    list_display = (
        "patient_id",
        "version",
        "status",
        "mae_15",
        "mae_30",
        "mae_60",
        "trained_at",
        "approved_by",
    )
    list_filter = ("status", "version")
    search_fields = ("patient_id",)
    readonly_fields = (
        "id",
        "patient_id",
        "version",
        "mae_15",
        "mae_30",
        "mae_60",
        "trained_at",
        "approved_at",
        "approved_by",
    )
    actions = ["approve_models", "reject_models"]

    @admin.action(description="✅ Approuver les modèles sélectionnés")
    def approve_models(self, request, queryset):
        done = 0
        for obj in queryset.filter(status=PersonalModelApproval.STATUS_PENDING):
            try:
                _call_ai_service(
                    f"/finetune/{obj.patient_id}/approve?version={obj.version}"
                )
                obj.status = PersonalModelApproval.STATUS_APPROVED
                obj.approved_at = timezone.now()
                obj.approved_by = request.user
                obj.save(update_fields=["status", "approved_at", "approved_by"])
                done += 1
            except Exception as exc:
                self.message_user(
                    request, f"Erreur patient {obj.patient_id}: {exc}", level="error"
                )
        if done:
            self.message_user(request, f"{done} modèle(s) approuvé(s) et activé(s).")

    @admin.action(description="❌ Rejeter les modèles sélectionnés")
    def reject_models(self, request, queryset):
        done = 0
        for obj in queryset.filter(status=PersonalModelApproval.STATUS_PENDING):
            try:
                _call_ai_service(
                    f"/finetune/{obj.patient_id}/reject?version={obj.version}"
                )
                obj.status = PersonalModelApproval.STATUS_REJECTED
                obj.save(update_fields=["status"])
                done += 1
            except Exception as exc:
                self.message_user(
                    request, f"Erreur patient {obj.patient_id}: {exc}", level="error"
                )
        if done:
            self.message_user(request, f"{done} modèle(s) rejeté(s).")
