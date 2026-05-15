from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.activities.models import Activity, UserActivity

User = get_user_model()


class ActivityReadOnlyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="act-more@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)
        self.activity = Activity.objects.create(
            name="Tennis",
            recommended_duration=60,
            calories_burned=400,
        )

    def test_activities_reference_is_readonly(self):
        response = self.client.post(
            "/api/activities/types/",
            {"name": "Hack"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_retrieve_activity_by_pk(self):
        response = self.client.get(f"/api/activities/types/{self.activity.activity_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Tennis")
        self.assertEqual(response.data["calories_burned"], 400)


class UserActivityUpdateTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="act-update@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)
        self.activity = Activity.objects.create(name="Marche", calories_burned=150)
        self.now = timezone.now()
        self.ua = UserActivity.objects.create(
            user=self.user,
            activity=self.activity,
            start=self.now,
            end=self.now + timedelta(minutes=30),
        )

    def test_patch_user_activity_intensity(self):
        response = self.client.patch(
            f"/api/activities/history/{self.ua.id}/",
            {"intensity": "intense"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.ua.refresh_from_db()
        self.assertEqual(self.ua.intensity, "intense")

    def test_retrieve_own_activity(self):
        response = self.client.get(f"/api/activities/history/{self.ua.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_access_other_user_activity(self):
        other = User.objects.create_user(email="other-act-more@test.com", password="pass123")
        other_ua = UserActivity.objects.create(
            user=other, activity=self.activity,
            start=self.now, end=self.now + timedelta(minutes=20)
        )
        response = self.client.get(f"/api/activities/history/{other_ua.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
