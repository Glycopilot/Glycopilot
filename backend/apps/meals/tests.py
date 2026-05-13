from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.meals.models import Meal, UserMeal

User = get_user_model()


class MealViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="meal@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)
        self.meal = Meal.objects.create(
            name="Salade verte",
            calories=120,
            glucose=5.0,
        )

    def test_list_meals_returns_200(self):
        response = self.client.get("/api/meals/meals/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_meals_includes_created_meal(self):
        response = self.client.get("/api/meals/meals/")
        names = [m["name"] for m in response.data.get("results", response.data)]
        self.assertIn("Salade verte", names)

    def test_retrieve_meal_returns_correct_data(self):
        response = self.client.get(f"/api/meals/meals/{self.meal.meal_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Salade verte")

    def test_list_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/meals/meals/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserMealViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="usermeal@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)
        self.meal = Meal.objects.create(name="Riz complet", calories=200, glucose=40.0)

    def test_create_user_meal(self):
        payload = {
            "meal": self.meal.meal_id,
            "taken_at": timezone.now().isoformat(),
        }
        response = self.client.post("/api/meals/user-meals/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            UserMeal.objects.filter(user=self.user, meal=self.meal).exists()
        )

    def test_list_user_meals_only_shows_own(self):
        other_user = User.objects.create_user(email="other-meal@test.com", password="pass123")
        UserMeal.objects.create(user=other_user, meal=self.meal, taken_at=timezone.now())
        UserMeal.objects.create(user=self.user, meal=self.meal, taken_at=timezone.now())

        response = self.client.get("/api/meals/user-meals/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_delete_user_meal(self):
        um = UserMeal.objects.create(user=self.user, meal=self.meal, taken_at=timezone.now())
        response = self.client.delete(f"/api/meals/user-meals/{um.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserMeal.objects.filter(id=um.id).exists())

    def test_list_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/meals/user-meals/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
