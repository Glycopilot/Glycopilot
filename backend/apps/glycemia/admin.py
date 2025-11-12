from django.contrib import admin
from .models import Glycemia

@admin.register(Glycemia)
class GlycemiaAdmin(admin.ModelAdmin):
    list_display = ("user", "timestamp", "value", "period")
    list_filter = ("period",)
