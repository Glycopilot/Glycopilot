# User Serializer
from rest_framework import serializers
from models.user import User

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer pour le modèle User
    """
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer pour la création d'utilisateur
    """
    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name']

class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer pour la mise à jour d'utilisateur
    """
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'is_active']
