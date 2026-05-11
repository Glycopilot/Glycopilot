"""Tests for meals app — UserMeal CRUD + MealViewSet (read-only)."""
from django.utils.timezone import now

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.meals.models import Meal, UserMeal
from apps.profiles.models import Role
from apps.users.models import AuthAccount
from apps.users.models import User as UserIdentity

# ─── Helpers ────────────────────────────────────────────────────────────────


def _make_user(email="meal_user@test.com", password="pass123"):
    identity = UserIdentity.objects.create(first_name="Meal", last_name="Tester")
    account = AuthAccount.objects.create_user(
        email=email, password=password, user_identity=identity
    )
    return account


def _make_meal(name="Salade César", calories=350):
    return Meal.objects.create(name=name, calories=calories, glucose=5.0)


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ─── MealViewSet (read-only reference) ──────────────────────────────────────


@pytest.mark.django_db
class TestMealReferenceViewSet:
    def test_list_meals_authenticated(self):
        _make_meal("Poulet rôti", 500)
        _make_meal("Riz brun", 200)
        user = _make_user()
        client = _auth_client(user)

        resp = client.get("/api/meals/reference/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) >= 2

    def test_list_meals_unauthenticated(self):
        client = APIClient()
        resp = client.get("/api/meals/reference/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_single_meal(self):
        meal = _make_meal("Omelette", 300)
        user = _make_user()
        client = _auth_client(user)

        resp = client.get(f"/api/meals/reference/{meal.meal_id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Omelette"

    def test_cannot_create_meal_via_reference(self):
        """Reference ViewSet is read-only — POST should 405."""
        user = _make_user()
        client = _auth_client(user)

        resp = client.post("/api/meals/reference/", {"name": "Test"})
        assert resp.status_code in (
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_403_FORBIDDEN,
        )


# ─── UserMealViewSet (CRUD) ──────────────────────────────────────────────────


@pytest.mark.django_db
class TestUserMealViewSet:
    def test_create_user_meal(self):
        meal = _make_meal()
        user = _make_user()
        client = _auth_client(user)

        resp = client.post(
            "/api/meals/log/",
            {"meal_id": meal.meal_id, "taken_at": now().isoformat()},
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert UserMeal.objects.filter(user=user).count() == 1

    def test_list_user_meals_filtered_by_user(self):
        meal = _make_meal()
        user1 = _make_user("user1@test.com")
        user2 = _make_user("user2@test.com")

        UserMeal.objects.create(user=user1, meal=meal, taken_at=now())

        client = _auth_client(user2)
        resp = client.get("/api/meals/log/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) == 0

    def test_list_user_meals_returns_own_meals(self):
        meal = _make_meal()
        user = _make_user()
        UserMeal.objects.create(user=user, meal=meal, taken_at=now())
        client = _auth_client(user)

        resp = client.get("/api/meals/log/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) == 1

    def test_delete_user_meal(self):
        meal = _make_meal()
        user = _make_user()
        entry = UserMeal.objects.create(user=user, meal=meal, taken_at=now())
        client = _auth_client(user)

        resp = client.delete(f"/api/meals/log/{entry.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
        assert UserMeal.objects.filter(id=entry.id).count() == 0

    def test_unauthenticated_cannot_access_meal_log(self):
        client = APIClient()
        resp = client.get("/api/meals/log/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
