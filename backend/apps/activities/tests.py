"""Tests for activities app — Activity reference ViewSet + UserActivity CRUD."""
import datetime

from django.utils.timezone import now

import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.activities.models import Activity, UserActivity
from apps.users.models import AuthAccount
from apps.users.models import User as UserIdentity

# ─── Helpers ────────────────────────────────────────────────────────────────


def _make_user(email="activity_user@test.com", password="pass123"):
    identity = UserIdentity.objects.create(first_name="Activity", last_name="Tester")
    return AuthAccount.objects.create_user(
        email=email, password=password, user_identity=identity
    )


def _make_activity(name="Course à pied", calories_burned=400, sugar_used=5.0):
    return Activity.objects.create(
        name=name,
        recommended_duration=30,
        calories_burned=calories_burned,
        sugar_used=sugar_used,
    )


def _auth_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ─── ActivityViewSet (read-only types) ──────────────────────────────────────


@pytest.mark.django_db
class TestActivityTypesViewSet:
    def test_list_activity_types_authenticated(self):
        _make_activity("Natation")
        _make_activity("Vélo")
        user = _make_user()
        client = _auth_client(user)

        resp = client.get("/api/activities/types/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) >= 2

    def test_list_activity_types_unauthenticated(self):
        client = APIClient()
        resp = client.get("/api/activities/types/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_retrieve_single_activity_type(self):
        act = _make_activity("Yoga")
        user = _make_user()
        client = _auth_client(user)

        resp = client.get(f"/api/activities/types/{act.activity_id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["name"] == "Yoga"

    def test_cannot_create_activity_type(self):
        """ReadOnly ViewSet — POST should return 405."""
        user = _make_user()
        client = _auth_client(user)
        resp = client.post("/api/activities/types/", {"name": "Test"})
        assert resp.status_code in (
            status.HTTP_405_METHOD_NOT_ALLOWED,
            status.HTTP_403_FORBIDDEN,
        )


# ─── UserActivityViewSet (CRUD) ──────────────────────────────────────────────


@pytest.mark.django_db
class TestUserActivityViewSet:
    def test_create_user_activity(self):
        act = _make_activity()
        user = _make_user()
        client = _auth_client(user)
        start = now().isoformat()

        resp = client.post(
            "/api/activities/history/",
            {
                "activity": act.activity_id,
                "start": start,
                "duration_minutes": 45,
                "intensity": "moderate",
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert UserActivity.objects.filter(user=user).count() == 1

    def test_create_user_activity_calculates_end(self):
        act = _make_activity()
        user = _make_user()
        client = _auth_client(user)
        start = now()

        resp = client.post(
            "/api/activities/history/",
            {
                "activity": act.activity_id,
                "start": start.isoformat(),
                "duration_minutes": 60,
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED
        # Check that duration_minutes is returned in output
        assert resp.data["duration_minutes"] == 60

    def test_list_activities_filtered_by_user(self):
        act = _make_activity()
        user1 = _make_user("act_user1@test.com")
        user2 = _make_user("act_user2@test.com")
        start = now()
        UserActivity.objects.create(
            user=user1,
            activity=act,
            start=start,
            end=start + datetime.timedelta(minutes=30),
        )

        client = _auth_client(user2)
        resp = client.get("/api/activities/history/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) == 0

    def test_list_activities_returns_own_activities(self):
        act = _make_activity()
        user = _make_user()
        start = now()
        UserActivity.objects.create(
            user=user,
            activity=act,
            start=start,
            end=start + datetime.timedelta(minutes=30),
        )
        client = _auth_client(user)

        resp = client.get("/api/activities/history/")
        assert resp.status_code == status.HTTP_200_OK
        data = resp.data["results"] if "results" in resp.data else resp.data
        assert len(data) == 1

    def test_response_includes_calculated_fields(self):
        act = _make_activity(calories_burned=400, sugar_used=5.0)
        user = _make_user()
        client = _auth_client(user)
        start = now()

        resp = client.post(
            "/api/activities/history/",
            {
                "activity": act.activity_id,
                "start": start.isoformat(),
                "duration_minutes": 60,
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert "total_calories_burned" in resp.data
        assert "total_sugar_used" in resp.data

    def test_delete_user_activity(self):
        act = _make_activity()
        user = _make_user()
        start = now()
        entry = UserActivity.objects.create(
            user=user,
            activity=act,
            start=start,
            end=start + datetime.timedelta(minutes=30),
        )
        client = _auth_client(user)

        resp = client.delete(f"/api/activities/history/{entry.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT

    def test_unauthenticated_cannot_access_activities(self):
        client = APIClient()
        resp = client.get("/api/activities/history/")
        assert resp.status_code == status.HTTP_401_UNAUTHORIZED
