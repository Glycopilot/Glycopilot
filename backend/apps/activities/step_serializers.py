from rest_framework import serializers


class DailyStepsSyncSerializer(serializers.Serializer):
    day = serializers.DateField(required=False)
    steps = serializers.IntegerField(min_value=0, max_value=2_000_000)
