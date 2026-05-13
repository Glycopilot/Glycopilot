from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from apps.activities.models import Activity, UserActivity

User = get_user_model()


class ActivityViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="act@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)
        self.activity = Activity.objects.create(
            name="Course à pied",
            calories_burned=300,
        )

    def test_list_activities_returns_200(self):
        response = self.client.get("/api/activities/activities/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_activities_includes_created_activity(self):
        response = self.client.get("/api/activities/activities/")
        names = [a["name"] for a in response.data.get("results", response.data)]
        self.assertIn("Course à pied", names)

    def test_retrieve_activity_returns_correct_data(self):
        response = self.client.get(f"/api/activities/activities/{self.activity.activity_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Course à pied")

    def test_list_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/activities/activities/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserActivityViewSetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="useract@test.com", password="pass123")
        self.client.force_authenticate(user=self.user)
        self.activity = Activity.objects.create(name="Natation", calories_burned=250)
        self.now = timezone.now()

    def test_create_user_activity(self):
        payload = {
            "activity": self.activity.activity_id,
            "start": self.now.isoformat(),
            "end": (self.now + timedelta(minutes=30)).isoformat(),
            "intensity": "moderate",
        }
        response = self.client.post("/api/activities/user-activities/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            UserActivity.objects.filter(user=self.user, activity=self.activity).exists()
        )

    def test_list_user_activities_only_shows_own(self):
        other = User.objects.create_user(email="other-act@test.com", password="pass123")
        UserActivity.objects.create(
            user=other, activity=self.activity,
            start=self.now, end=self.now + timedelta(minutes=20)
        )
        UserActivity.objects.create(
            user=self.user, activity=self.activity,
            start=self.now, end=self.now + timedelta(minutes=30)
        )

        response = self.client.get("/api/activities/user-activities/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)

    def test_delete_user_activity(self):
        ua = UserActivity.objects.create(
            user=self.user, activity=self.activity,
            start=self.now, end=self.now + timedelta(minutes=15)
        )
        response = self.client.delete(f"/api/activities/user-activities/{ua.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(UserActivity.objects.filter(id=ua.id).exists())

    def test_list_requires_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/activities/user-activities/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
