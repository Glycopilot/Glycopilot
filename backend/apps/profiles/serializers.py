from rest_framework import serializers
from .models import Profile
from apps.users.serializers import UserSerializer

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Profile
        fields = ["id", "user", "role", "label", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
