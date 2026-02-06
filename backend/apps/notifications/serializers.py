"""Serializers for notifications app."""

from rest_framework import serializers

from .models import DeviceType, PushToken


class PushTokenSerializer(serializers.ModelSerializer):
    """Serializer for registering push tokens."""

    device_type = serializers.ChoiceField(
        choices=DeviceType.choices,
        default=DeviceType.ANDROID,
    )

    class Meta:
        model = PushToken
        fields = ["id", "token", "device_type", "is_active", "created_at"]
        read_only_fields = ["id", "is_active", "created_at"]

    def validate_token(self, value):
        """Validate Expo push token format."""
        if not value.startswith("ExponentPushToken["):
            raise serializers.ValidationError(
                "Invalid token format. Must be an Expo push token."
            )
        return value

    def create(self, validated_data):
        """Create or update push token for user."""
        user = self.context["request"].user
        token = validated_data["token"]

        # Update if token exists, create if not
        push_token, created = PushToken.objects.update_or_create(
            token=token,
            defaults={
                "user": user,
                "device_type": validated_data.get("device_type", DeviceType.ANDROID),
                "is_active": True,
            },
        )
        return push_token
