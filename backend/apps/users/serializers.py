from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone_number",
            "birth_date",
            "address",
            "medical_comment",
            "actif",
            "linked_user_id",
            "medical_id",
            "is_active",
            "is_staff",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "role",
            "actif",
            "linked_user_id",
            "is_active",
            "is_staff",
            "created_at",
            "updated_at",
        ]
