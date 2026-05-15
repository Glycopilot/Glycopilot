from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.meals.models import Meal, UserMeal

User = get_user_model()


class MealUpdateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="meal-update@test.com", password="pass123")
        self.other = User.objects.create_user(email="meal-update-other@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)
        self.meal = Meal.objects.create(name="Salade", calories=80, glucose=5.0)
        self.um = UserMeal.objects.create(user=self.user, meal=self.meal, taken_at=timezone.now())

    def test_update_user_meal_taken_at(self):
        new_time = (timezone.now() + timezone.timedelta(hours=1)).isoformat()
        response = self.client.patch(
            f"/api/meals/log/{self.um.id}/",
            {"taken_at": new_time},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_access_other_user_meal(self):
        other_um = UserMeal.objects.create(
            user=self.other, meal=self.meal, taken_at=timezone.now()
        )
        response = self.client.get(f"/api/meals/log/{other_um.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_meals_reference_is_readonly(self):
        # Should not be able to create a meal reference (ReadOnly ViewSet)
        response = self.client.post(
            "/api/meals/reference/",
            {"name": "New Meal", "calories": 100},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
