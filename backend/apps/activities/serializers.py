import datetime

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
    duration_minutes = serializers.IntegerField(write_only=True)
    intensity = serializers.CharField(required=False, allow_blank=True)
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
            "intensity",
            "total_calories_burned",
            "total_sugar_used",
        ]
        read_only_fields = ["user", "end"]

    def create(self, validated_data):
        duration = validated_data.pop("duration_minutes")
        validated_data["end"] = validated_data["start"] + datetime.timedelta(
            minutes=duration
        )
        return super().create(validated_data)

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

    def to_representation(self, instance):
        """Add duration_minutes to the output representation."""
        ret = super().to_representation(instance)
        if instance.end and instance.start:
            ret["duration_minutes"] = int(
                (instance.end - instance.start).total_seconds() / 60
            )
        return ret
