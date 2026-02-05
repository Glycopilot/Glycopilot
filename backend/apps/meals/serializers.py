from rest_framework import serializers
from .models import Meal, UserMeal

class MealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meal
        fields = '__all__'

class UserMealSerializer(serializers.ModelSerializer):
    meal = MealSerializer(read_only=True)
    meal_id = serializers.PrimaryKeyRelatedField(
        queryset=Meal.objects.all(), source='meal', write_only=True
    )
    
    class Meta:
        model = UserMeal
        fields = ['id', 'user', 'meal', 'meal_id', 'taken_at']
        read_only_fields = ['user']
