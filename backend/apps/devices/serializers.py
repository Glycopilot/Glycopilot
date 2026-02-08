from rest_framework import serializers

from .models import Device


class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = [
            "id",
            "name",
            "device_type",
            "provider",
            "model",
            "serial_number",
            "is_active",
            "started_at",
            "ended_at",
            "sampling_interval_sec",
            "timezone",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
