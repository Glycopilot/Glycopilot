from rest_framework import serializers

from .models import Activity, UserActivity


class ActivitySerializer(serializers.ModelSerializer):
    """Serializer for the Activity reference model."""

    class Meta:
        model = Activity
        fields = "__all__"


class UserActivitySerializer(serializers.ModelSerializer):
    """Serializer for user activity logs with auto-calculation."""

    activity_details = ActivitySerializer(source="activity", read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    total_calories_burned = serializers.SerializerMethodField()
    total_sugar_used = serializers.SerializerMethodField()

    class Meta:
        model = UserActivity
        fields = [
            "id",
            "user",
            "activity",
            "activity_details",
            "start",
            "end",
            "duration_minutes",
            "total_calories_burned",
            "total_sugar_used",
        ]
        read_only_fields = ["user"]

    def validate(self, data):
        """Check that end date is after start date."""
        if data["end"] <= data["start"]:
            raise serializers.ValidationError(
                {"end": "End time must be after start time."}
            )
        return data

    def get_duration_minutes(self, obj):
        return int((obj.end - obj.start).total_seconds() / 60)

    def get_total_calories_burned(self, obj):
        duration_hours = (obj.end - obj.start).total_seconds() / 3600
        if obj.activity.calories_burned:
            return int(duration_hours * obj.activity.calories_burned)
        return 0

    def get_total_sugar_used(self, obj):
        duration_hours = (obj.end - obj.start).total_seconds() / 3600
        if obj.activity.sugar_used:
            return round(duration_hours * obj.activity.sugar_used, 2)
        return 0.0
