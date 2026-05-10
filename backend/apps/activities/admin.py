from django.contrib import admin

from .models import Activity, UserActivity, UserMilestonePoints, UserStepDayCheckpoint


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour Activity."""

    list_display = (
        "name",
        "recommended_duration",
        "calories_burned",
        "sugar_used",
    )
    list_filter = ("recommended_duration",)
    search_fields = ("name",)
    ordering = ("name",)


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour UserActivity."""

    list_display = ("user", "activity", "start", "end")
    list_filter = ("activity", "start", "end")
    search_fields = ("user__username", "user__email", "activity__name")
    raw_id_fields = ("user", "activity")
    date_hierarchy = "start"


@admin.register(UserStepDayCheckpoint)
class UserStepDayCheckpointAdmin(admin.ModelAdmin):
    list_display = ("user", "day", "last_reported_steps")
    list_filter = ("day",)
    raw_id_fields = ("user",)


@admin.register(UserMilestonePoints)
class UserMilestonePointsAdmin(admin.ModelAdmin):
    list_display = ("user", "total_points")
    raw_id_fields = ("user",)
