import pytest
from django.contrib.auth import get_user_model
from django.utils.timezone import now, timedelta

from rest_framework.test import APIClient

from apps.activities.models import Activity, UserActivity
from apps.activities.serializers import ActivitySerializer, UserActivitySerializer

User = get_user_model()

# ─── Fixtures ────────────────────────────────────────────────────


@pytest.fixture
def user(db):
    return User.objects.create_user(
        email="activity_test@example.com", password="pass1234"
    )  # NOSONAR


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        email="activity_other@example.com", password="pass1234"
    )  # NOSONAR


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def activity(db):
    return Activity.objects.create(
        name="Running",
        recommended_duration=30,
        calories_burned=600,
        sugar_used=5.0,
    )


@pytest.fixture
def user_activity(user, activity):
    start = now()
    return UserActivity.objects.create(
        user=user,
        activity=activity,
        start=start,
        end=start + timedelta(minutes=30),
    )


# ═══════════════════════════════════════════════════════════════════
# 1. MODÈLES
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestActivityModel:
    def test_activity_creation(self, activity):
        assert activity.name == "Running"
        assert activity.calories_burned == 600
        assert activity.sugar_used == 5.0

    def test_activity_optional_fields_null(self, db):
        a = Activity.objects.create(name="Yoga")
        assert a.recommended_duration is None
        assert a.calories_burned is None
        assert a.sugar_used is None
        assert a.link_photo is None


@pytest.mark.django_db
class TestUserActivityModel:
    def test_user_activity_creation(self, user_activity, user, activity):
        assert user_activity.user == user
        assert user_activity.activity == activity
        assert user_activity.end > user_activity.start

    def test_duration_is_stored(self, user_activity):
        duration = (user_activity.end - user_activity.start).total_seconds() / 60
        assert int(duration) == 30


# ═══════════════════════════════════════════════════════════════════
# 2. REFERENCE (LECTURE SEULE)
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestActivityTypesAPI:
    def test_list_activity_types(self, client, activity):
        resp = client.get("/api/activities/types/")
        assert resp.status_code == 200
        names = [a["name"] for a in resp.json()["results"] if "results" in resp.json()] or [
            a["name"] for a in resp.json()
        ]
        assert "Running" in names

    def test_retrieve_activity_type(self, client, activity):
        resp = client.get(f"/api/activities/types/{activity.activity_id}/")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Running"

    def test_cannot_create_activity_type(self, client):
        resp = client.post("/api/activities/types/", {"name": "Hacking"})
        assert resp.status_code == 405


# ═══════════════════════════════════════════════════════════════════
# 3. HISTORIQUE UTILISATEUR — CRUD
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestUserActivityCRUD:
    def test_create_user_activity(self, client, activity):
        resp = client.post("/api/activities/history/", {
            "activity": activity.activity_id,
            "start": now().isoformat(),
            "duration_minutes": 45,
        }, format="json")
        assert resp.status_code == 201
        data = resp.json()
        assert data["duration_minutes"] == 45
        assert data["activity"] == activity.activity_id

    def test_end_is_calculated_from_duration(self, client, activity):
        start = now()
        resp = client.post("/api/activities/history/", {
            "activity": activity.activity_id,
            "start": start.isoformat(),
            "duration_minutes": 60,
        }, format="json")
        assert resp.status_code == 201
        ua = UserActivity.objects.get(id=resp.json()["id"])
        duration = (ua.end - ua.start).total_seconds() / 60
        assert int(duration) == 60

    def test_list_returns_only_own_activities(self, client, user_activity, other_user, activity):
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)
        other_client.post("/api/activities/history/", {
            "activity": activity.activity_id,
            "start": now().isoformat(),
            "duration_minutes": 20,
        }, format="json")

        resp = client.get("/api/activities/history/")
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.json().get("results", resp.json())]
        assert all(
            UserActivity.objects.get(id=i).user.email == "activity_test@example.com"
            for i in ids
        )

    def test_retrieve_user_activity(self, client, user_activity):
        resp = client.get(f"/api/activities/history/{user_activity.id}/")
        assert resp.status_code == 200
        assert resp.json()["id"] == user_activity.id

    def test_partial_update_user_activity(self, client, user_activity):
        resp = client.patch(
            f"/api/activities/history/{user_activity.id}/",
            {"intensity": "high"},
            format="json",
        )
        assert resp.status_code == 200
        assert resp.json()["intensity"] == "high"

    def test_delete_user_activity(self, client, user_activity):
        resp = client.delete(f"/api/activities/history/{user_activity.id}/")
        assert resp.status_code == 204
        assert not UserActivity.objects.filter(id=user_activity.id).exists()

    def test_cannot_access_other_user_activity(self, other_user, user_activity):
        other_client = APIClient()
        other_client.force_authenticate(user=other_user)
        resp = other_client.get(f"/api/activities/history/{user_activity.id}/")
        assert resp.status_code == 404


# ═══════════════════════════════════════════════════════════════════
# 4. CALCULS AUTOMATIQUES
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestUserActivityCalculations:
    def test_total_calories_burned(self, client, activity):
        # activity: 600 cal/h, 60 min → 600 cal
        resp = client.post("/api/activities/history/", {
            "activity": activity.activity_id,
            "start": now().isoformat(),
            "duration_minutes": 60,
        }, format="json")
        assert resp.status_code == 201
        assert resp.json()["total_calories_burned"] == 600

    def test_total_sugar_used(self, client, activity):
        # activity: 5.0 sugar/h, 30 min → 2.5
        resp = client.post("/api/activities/history/", {
            "activity": activity.activity_id,
            "start": now().isoformat(),
            "duration_minutes": 30,
        }, format="json")
        assert resp.status_code == 201
        assert resp.json()["total_sugar_used"] == 2.5

    def test_no_calories_when_activity_has_none(self, client, db):
        a = Activity.objects.create(name="Stretching")
        resp = client.post("/api/activities/history/", {
            "activity": a.activity_id,
            "start": now().isoformat(),
            "duration_minutes": 30,
        }, format="json")
        assert resp.status_code == 201
        assert resp.json()["total_calories_burned"] == 0
        assert resp.json()["total_sugar_used"] == 0.0


@pytest.mark.django_db
def test_activity_serializer_exposes_reference_fields():
    activity = Activity.objects.create(
        name="Marche",
        recommended_duration=30,
        calories_burned=180,
        sugar_used=12.5,
    )

    data = ActivitySerializer(activity).data

    assert data["name"] == "Marche"
    assert data["calories_burned"] == 180


@pytest.mark.django_db
def test_user_activity_serializer_calculates_end_and_totals():
    user = User.objects.create_user(email="activity@example.com", password="pass1234")
    activity = Activity.objects.create(
        name="Course",
        calories_burned=600,
        sugar_used=30,
    )
    start = now()
    serializer = UserActivitySerializer(
        data={
            "activity": activity.pk,
            "start": start.isoformat(),
            "duration_minutes": 45,
            "intensity": "modérée",
        }
    )

    assert serializer.is_valid(), serializer.errors
    instance = serializer.save(user=user)
    representation = UserActivitySerializer(instance).data

    assert instance.end > instance.start
    assert representation["duration_minutes"] == 45
    assert representation["total_calories_burned"] == 450
    assert representation["total_sugar_used"] == 22.5


@pytest.mark.django_db
def test_user_activity_serializer_returns_zero_totals_without_activity_metrics():
    user = User.objects.create_user(email="activity-zero@example.com", password="pass1234")
    activity = Activity.objects.create(name="Etirements")
    start = now()
    instance = UserActivity.objects.create(
        user=user,
        activity=activity,
        start=start,
        end=start,
    )

    representation = UserActivitySerializer(instance).data

    assert representation["total_calories_burned"] == 0
    assert representation["total_sugar_used"] == 0.0
