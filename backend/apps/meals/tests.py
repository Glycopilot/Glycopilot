import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils.timezone import now

from rest_framework.test import APIClient

from apps.meals.models import Meal, UserMeal

User = get_user_model()

# ─── Fixtures ────────────────────────────────────────────────────


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="meals_test@example.com", password="pass1234"
    )  # NOSONAR


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="meals_other@example.com", password="pass1234"
    )  # NOSONAR


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def meal(db):
    return Meal.objects.create(
        name="Oatmeal",
        glucose=55.0,
        calories=350,
    )


@pytest.fixture
def user_meal(user, meal):
    return UserMeal.objects.create(user=user, meal=meal, taken_at=now())


# ═══════════════════════════════════════════════════════════════════
# 1. MODÈLES
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestMealModel:
    def test_meal_creation(self, meal):
        assert meal.name == "Oatmeal"
        assert meal.glucose == 55.0
        assert meal.calories == 350

    def test_meal_optional_fields_null(self, db):
        m = Meal.objects.create(name="Plain rice")
        assert m.ingredients is None
        assert m.recipe is None
        assert m.link_photo is None


@pytest.mark.django_db
class TestUserMealModel:
    def test_user_meal_creation(self, user_meal, user, meal):
        assert user_meal.user == user
        assert user_meal.meal == meal

    def test_unique_together_constraint(self, user, meal):
        taken = now()
        UserMeal.objects.create(user=user, meal=meal, taken_at=taken)
        with pytest.raises(IntegrityError):
            UserMeal.objects.create(user=user, meal=meal, taken_at=taken)

    def test_same_meal_different_time_allowed(self, user, meal):
        UserMeal.objects.create(user=user, meal=meal, taken_at=now())
        UserMeal.objects.create(user=user, meal=meal, taken_at=now())
        assert UserMeal.objects.filter(user=user, meal=meal).count() == 2


# ═══════════════════════════════════════════════════════════════════
# 2. RÉFÉRENCE (LECTURE SEULE)
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestMealReferenceAPI:
    def test_list_meals_reference(self, client, meal):
        resp = client.get("/api/meals/reference/")
        assert resp.status_code == 200
        data = resp.json()
        names = [m["name"] for m in (data.get("results") or data)]
        assert "Oatmeal" in names

    def test_retrieve_meal_reference(self, client, meal):
        resp = client.get(f"/api/meals/reference/{meal.meal_id}/")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Oatmeal"

    def test_cannot_create_via_reference_endpoint(self, client):
        resp = client.post("/api/meals/reference/", {"name": "Hack"})
        assert resp.status_code == 405


# ═══════════════════════════════════════════════════════════════════
# 3. LOG UTILISATEUR — CRUD
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestUserMealCRUD:
    def test_create_user_meal(self, client, meal):
        resp = client.post("/api/meals/log/", {
            "meal_id": meal.meal_id,
            "taken_at": now().isoformat(),
        }, format="json")
        assert resp.status_code == 201
        assert resp.json()["meal"]["name"] == "Oatmeal"

    def test_list_returns_only_own_meals(self, client, user_meal, other_user, meal):
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)
        other_client.post("/api/meals/log/", {
            "meal_id": meal.meal_id,
            "taken_at": now().isoformat(),
        }, format="json")

        resp = client.get("/api/meals/log/")
        assert resp.status_code == 200
        ids = [m["id"] for m in (resp.json().get("results") or resp.json())]
        assert all(
            UserMeal.objects.get(id=i).user.email == "meals_test@example.com"
            for i in ids
        )

    def test_retrieve_user_meal(self, client, user_meal):
        resp = client.get(f"/api/meals/log/{user_meal.id}/")
        assert resp.status_code == 200
        assert resp.json()["id"] == user_meal.id

    def test_delete_user_meal(self, client, user_meal):
        resp = client.delete(f"/api/meals/log/{user_meal.id}/")
        assert resp.status_code == 204
        assert not UserMeal.objects.filter(id=user_meal.id).exists()

    def test_cannot_access_other_user_meal(self, other_user, user_meal):
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)
        resp = other_client.get(f"/api/meals/log/{user_meal.id}/")
        assert resp.status_code == 404

