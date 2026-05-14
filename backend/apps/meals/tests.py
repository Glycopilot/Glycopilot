"""Tests for meals app."""

from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.utils.timezone import now
from rest_framework.test import APIClient

from apps.meals.models import Meal, UserMeal

User = get_user_model()

OFF_PRODUCT = {
    "status": 1,
    "product": {
        "product_name_fr": "Nutella",
        "code": "3017620422003",
        "nutriments": {
            "energy-kcal_100g": 539,
            "carbohydrates_100g": 57.5,
            "proteins_100g": 6.3,
            "fat_100g": 30.9,
        },
        "image_front_url": "https://example.com/nutella.jpg",
    },
}


# ─── Helpers (setup_method style) ────────────────────────────────────────────


def make_user(email="user@test.com"):
    return User.objects.create_user(email=email, password="TestPass123!")


def make_meal(**kwargs):
    defaults = {
        "name": "Pomme",
        "glucides": 10.0,
        "calories": 52,
        "proteines": 0.3,
        "lipides": 0.2,
        "source": Meal.SOURCE_MANUAL,
    }
    defaults.update(kwargs)
    return Meal.objects.create(**defaults)


def make_user_meal(user, meal, taken_at=None, **kwargs):
    defaults = {
        "meal_type": "lunch",
        "portion_g": 100.0,
        "input_mode": "manual",
        "taken_at": taken_at or datetime(2026, 5, 14, 12, 0, tzinfo=timezone.utc),
    }
    defaults.update(kwargs)
    return UserMeal.objects.create(user=user, meal=meal, **defaults)


# ─── Fixtures (pytest style) ─────────────────────────────────────────────────


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
def auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def meal(db):
    return Meal.objects.create(name="Oatmeal", glucose=55.0, calories=350)


@pytest.fixture
def user_meal(user, meal):
    return UserMeal.objects.create(
        user=user, meal=meal, taken_at=now(), meal_type="lunch", input_mode="manual"
    )


# ═══════════════════════════════════════════════════════════════════
# 1. MODELES
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

    def test_same_meal_different_time_allowed(self, user, meal):
        UserMeal.objects.create(
            user=user, meal=meal, taken_at=datetime(2026, 5, 14, 12, 0, tzinfo=timezone.utc),
            meal_type="lunch", input_mode="manual",
        )
        UserMeal.objects.create(
            user=user, meal=meal, taken_at=datetime(2026, 5, 14, 19, 0, tzinfo=timezone.utc),
            meal_type="dinner", input_mode="manual",
        )
        assert UserMeal.objects.filter(user=user, meal=meal).count() == 2


# ═══════════════════════════════════════════════════════════════════
# 2. REFERENCE CATALOGUE — LECTURE
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestMealReferenceList:
    def setup_method(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_list_returns_all_meals(self):
        make_meal(name="Pomme")
        make_meal(name="Banane")
        resp = self.client.get("/api/meals/reference/")
        assert resp.status_code == 200
        names = [m["name"] for m in resp.data["results"]]
        assert "Pomme" in names
        assert "Banane" in names

    def test_search_filters_by_name(self):
        make_meal(name="Pomme golden")
        make_meal(name="Banane")
        resp = self.client.get("/api/meals/reference/?search=pomme")
        assert resp.status_code == 200
        names = [m["name"] for m in resp.data["results"]]
        assert "Banane" not in names

    def test_retrieve_single_meal(self, meal):
        resp = self.client.get(f"/api/meals/reference/{meal.meal_id}/")
        assert resp.status_code == 200
        assert resp.data["name"] == "Oatmeal"

    def test_cannot_create_via_reference_endpoint(self):
        resp = self.client.post("/api/meals/reference/", {"name": "Hack"})
        assert resp.status_code == 405

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get("/api/meals/reference/")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════
# 3. BY-BARCODE
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestByBarcode:
    def setup_method(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_returns_meal_when_barcode_exists(self):
        make_meal(name="Nutella", barcode="3017620422003")
        resp = self.client.get("/api/meals/reference/by-barcode/?code=3017620422003")
        assert resp.status_code == 200
        assert resp.data["name"] == "Nutella"

    def test_returns_404_when_not_found(self):
        resp = self.client.get("/api/meals/reference/by-barcode/?code=0000000000000")
        assert resp.status_code == 404

    def test_returns_400_when_code_missing(self):
        resp = self.client.get("/api/meals/reference/by-barcode/")
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════
# 4. FROM-OPENFOOD
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestFromOpenfood:
    def setup_method(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    @patch("apps.meals.views._fetch_url", return_value=OFF_PRODUCT)
    def test_creates_meal_from_openfood(self, mock_fetch):
        resp = self.client.post(
            "/api/meals/reference/from-openfood/",
            {"barcode": "3017620422003"},
            format="json",
        )
        assert resp.status_code == 201
        assert resp.data["name"] == "Nutella"
        assert Meal.objects.filter(barcode="3017620422003").exists()

    @patch("apps.meals.views._fetch_url", return_value=OFF_PRODUCT)
    def test_returns_cached_meal_without_calling_openfood(self, mock_fetch):
        make_meal(name="Nutella", barcode="3017620422003")
        resp = self.client.post(
            "/api/meals/reference/from-openfood/",
            {"barcode": "3017620422003"},
            format="json",
        )
        assert resp.status_code == 200
        mock_fetch.assert_not_called()

    @patch("apps.meals.views._fetch_url", return_value={"status": 0})
    def test_returns_404_when_product_not_in_openfood(self, mock_fetch):
        resp = self.client.post(
            "/api/meals/reference/from-openfood/",
            {"barcode": "0000000000000"},
            format="json",
        )
        assert resp.status_code == 404

    @patch("apps.meals.views._fetch_url", side_effect=Exception("timeout"))
    def test_returns_503_when_openfood_unreachable(self, mock_fetch):
        resp = self.client.post(
            "/api/meals/reference/from-openfood/",
            {"barcode": "3017620422003"},
            format="json",
        )
        assert resp.status_code == 503

    def test_returns_400_when_barcode_missing(self):
        resp = self.client.post(
            "/api/meals/reference/from-openfood/", {}, format="json"
        )
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════
# 5. SEARCH-OPENFOOD
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestSearchOpenfood:
    def setup_method(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    @patch(
        "apps.meals.views._fetch_url",
        return_value={
            "products": [
                {
                    "product_name_fr": "Yaourt nature",
                    "nutriments": {
                        "carbohydrates_100g": 5.0,
                        "energy-kcal_100g": 60,
                    },
                }
            ]
        },
    )
    def test_returns_product_list(self, mock_fetch):
        resp = self.client.get("/api/meals/reference/search-openfood/?q=yaourt")
        assert resp.status_code == 200
        assert len(resp.data) == 1
        assert resp.data[0]["name"] == "Yaourt nature"

    @patch("apps.meals.views._fetch_url", side_effect=Exception("timeout"))
    def test_returns_503_when_openfood_unreachable(self, mock_fetch):
        resp = self.client.get("/api/meals/reference/search-openfood/?q=yaourt")
        assert resp.status_code == 503

    def test_returns_400_when_query_missing(self):
        resp = self.client.get("/api/meals/reference/search-openfood/")
        assert resp.status_code == 400


# ═══════════════════════════════════════════════════════════════════
# 6. LOG UTILISATEUR — CRUD
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestUserMealLog:
    def setup_method(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)
        self.meal = make_meal()

    def test_list_returns_only_own_meals(self):
        other = make_user("other@test.com")
        make_user_meal(self.user, self.meal)
        make_user_meal(other, self.meal)
        resp = self.client.get("/api/meals/log/")
        assert resp.status_code == 200
        results = resp.data["results"] if "results" in resp.data else resp.data
        assert len(results) == 1

    def test_filter_by_date(self):
        make_user_meal(
            self.user, self.meal,
            taken_at=datetime(2026, 5, 14, 12, 0, tzinfo=timezone.utc),
        )
        make_user_meal(
            self.user, self.meal,
            taken_at=datetime(2026, 5, 15, 12, 0, tzinfo=timezone.utc),
        )
        resp = self.client.get("/api/meals/log/?date=2026-05-14")
        assert resp.status_code == 200
        results = resp.data["results"] if "results" in resp.data else resp.data
        assert len(results) == 1

    def test_create_user_meal(self):
        resp = self.client.post(
            "/api/meals/log/",
            {
                "meal_id": self.meal.meal_id,
                "taken_at": "2026-05-14T12:00:00Z",
                "meal_type": "lunch",
                "portion_g": 150,
                "input_mode": "manual",
            },
            format="json",
        )
        assert resp.status_code == 201
        assert UserMeal.objects.filter(user=self.user, meal=self.meal).exists()

    def test_retrieve_user_meal(self):
        um = make_user_meal(self.user, self.meal)
        resp = self.client.get(f"/api/meals/log/{um.id}/")
        assert resp.status_code == 200
        assert resp.data["id"] == um.id

    def test_delete_user_meal(self):
        um = make_user_meal(self.user, self.meal)
        resp = self.client.delete(f"/api/meals/log/{um.id}/")
        assert resp.status_code == 204
        assert not UserMeal.objects.filter(id=um.id).exists()

    def test_cannot_access_other_user_meal(self):
        other = make_user("other@test.com")
        um = make_user_meal(other, self.meal)
        resp = self.client.get(f"/api/meals/log/{um.id}/")
        assert resp.status_code == 404

    def test_cannot_delete_other_user_meal(self):
        other = make_user("other@test.com")
        um = make_user_meal(other, self.meal)
        resp = self.client.delete(f"/api/meals/log/{um.id}/")
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════
# 7. DAILY SUMMARY
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestDailySummary:
    def setup_method(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_calculates_totals_correctly(self):
        meal = make_meal(glucides=10.0, calories=52, proteines=1.0, lipides=0.5)
        make_user_meal(
            self.user, meal, portion_g=200.0,
            taken_at=datetime(2026, 5, 14, 12, 0, tzinfo=timezone.utc),
        )
        resp = self.client.get("/api/meals/log/daily-summary/?date=2026-05-14")
        assert resp.status_code == 200
        assert resp.data["total_glucides"] == 20.0
        assert resp.data["total_calories"] == 104
        assert resp.data["meal_count"] == 1

    def test_returns_zeros_when_no_meals(self):
        resp = self.client.get("/api/meals/log/daily-summary/?date=2026-05-14")
        assert resp.status_code == 200
        assert resp.data["total_glucides"] == 0.0
        assert resp.data["meal_count"] == 0

    def test_counts_by_meal_type(self):
        meal = make_meal()
        make_user_meal(
            self.user, meal, meal_type="breakfast",
            taken_at=datetime(2026, 5, 14, 8, 0, tzinfo=timezone.utc),
        )
        make_user_meal(
            self.user, meal, meal_type="lunch",
            taken_at=datetime(2026, 5, 14, 12, 0, tzinfo=timezone.utc),
        )
        resp = self.client.get("/api/meals/log/daily-summary/?date=2026-05-14")
        assert resp.data["meals_by_type"]["breakfast"] == 1
        assert resp.data["meals_by_type"]["lunch"] == 1
        assert resp.data["meals_by_type"]["dinner"] == 0


# ═══════════════════════════════════════════════════════════════════
# 8. RANGE SUMMARY
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestRangeSummary:
    def setup_method(self):
        self.client = APIClient()
        self.user = make_user()
        self.client.force_authenticate(user=self.user)

    def test_returns_one_entry_per_day(self):
        resp = self.client.get(
            "/api/meals/log/range-summary/?date_from=2026-05-12&date_to=2026-05-18"
        )
        assert resp.status_code == 200
        assert len(resp.data) == 7

    def test_calculates_glucides_per_day(self):
        meal = make_meal(glucides=10.0, calories=52)
        make_user_meal(
            self.user, meal, portion_g=100.0,
            taken_at=datetime(2026, 5, 14, 12, 0, tzinfo=timezone.utc),
        )
        resp = self.client.get(
            "/api/meals/log/range-summary/?date_from=2026-05-14&date_to=2026-05-14"
        )
        assert resp.status_code == 200
        assert resp.data[0]["date"] == "2026-05-14"
        assert resp.data[0]["total_glucides"] == 10.0
        assert resp.data[0]["meal_count"] == 1

    def test_days_without_meals_have_zero_values(self):
        resp = self.client.get(
            "/api/meals/log/range-summary/?date_from=2026-05-14&date_to=2026-05-14"
        )
        assert resp.data[0]["total_glucides"] == 0.0
        assert resp.data[0]["meal_count"] == 0

    def test_returns_400_when_dates_missing(self):
        resp = self.client.get("/api/meals/log/range-summary/")
        assert resp.status_code == 400

    def test_returns_400_for_invalid_date_format(self):
        resp = self.client.get(
            "/api/meals/log/range-summary/?date_from=not-a-date&date_to=2026-05-18"
        )
        assert resp.status_code == 400
