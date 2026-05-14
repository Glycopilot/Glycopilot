from rest_framework import serializers

from .models import Meal, UserMeal


class MealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meal
        fields = "__all__"


class UserMealSerializer(serializers.ModelSerializer):
    meal = MealSerializer(read_only=True)
    meal_id = serializers.PrimaryKeyRelatedField(
        queryset=Meal.objects.all(), source="meal", write_only=True
    )
    glucides_consommes = serializers.SerializerMethodField()
    calories_consommes = serializers.SerializerMethodField()

    class Meta:
        model = UserMeal
        fields = [
            "id",
            "user",
            "meal",
            "meal_id",
            "taken_at",
            "meal_type",
            "portion_g",
            "notes",
            "input_mode",
            "session_key",
            "glucides_consommes",
            "calories_consommes",
        ]
        read_only_fields = ["user"]

    def get_glucides_consommes(self, obj):
        if obj.meal.glucides is not None and obj.portion_g:
            return round(obj.meal.glucides * obj.portion_g / 100, 1)
        return None

    def get_calories_consommes(self, obj):
        if obj.meal.calories is not None and obj.portion_g:
            return round(obj.meal.calories * obj.portion_g / 100)
        return None
