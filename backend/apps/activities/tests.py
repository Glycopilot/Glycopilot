"""
Tests for Activities Endpoints
"""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User
from apps.activities.models import Activity, UserActivity

class ActivityTypesTest(TestCase):
    """
    Tests for /api/activities/types/ endpoint
    """

    def setUp(self):
        self.client = APIClient()
        self.types_url = reverse("activity-types-list") 

        # Create user and token
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
            first_name="Test",
            last_name="User"
        )
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

        # Create some activities
        Activity.objects.create(name="Running", calories_burned=500, sugar_used=2.5)
        Activity.objects.create(name="Walking", calories_burned=200, sugar_used=1.0)

    def test_list_activities_success(self):
        """Test authenticated user can list activity types"""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get(self.types_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle pagination
        if "results" in response.data:
            self.assertEqual(len(response.data["results"]), 2)
        else:
            self.assertEqual(len(response.data), 2)

    def test_list_activities_unauthenticated(self):
        """Test unauthenticated user cannot list activity types"""
        response = self.client.get(self.types_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class UserActivityHistoryTest(TestCase):
    """
    Tests for /api/activities/history/ endpoint
    """

    def setUp(self):
        self.client = APIClient()
        self.history_url = reverse("user-activity-list")

        # Create user and token
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="password123",
            first_name="Test",
            last_name="User"
        )
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

        # Create a reference activity with known rates
        # 600 calories per hour, 3.0g sugar per hour
        self.activity_run = Activity.objects.create(
            name="Running", 
            calories_burned=600, 
            sugar_used=3.0
        )

    def test_create_activity_log_success(self):
        """Test creating a log entry calculates duration, calories, and sugar"""
        start_time = timezone.now()
        end_time = start_time + timedelta(hours=1, minutes=30) # 1.5 hours

        payload = {
            "activity": self.activity_run.pk,
            "start": start_time,
            "end": end_time
        }

        response = self.client.post(self.history_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify calculations
        # Duration: 90 minutes
        self.assertEqual(response.data["duration_minutes"], 90)
        
        # Calories: 600 * 1.5 = 900
        self.assertEqual(response.data["total_calories_burned"], 900)
        
        # Sugar: 3.0 * 1.5 = 4.5
        self.assertEqual(response.data["total_sugar_used"], 4.5)

    def test_create_activity_invalid_dates(self):
        """Test error when end date is before start date"""
        start_time = timezone.now()
        end_time = start_time - timedelta(minutes=30)

        payload = {
            "activity": self.activity_run.pk,
            "start": start_time,
            "end": end_time
        }

        response = self.client.post(self.history_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end", response.data)

    def test_list_user_history(self):
        """Test retrieving user's own history"""
        # Create an entry
        UserActivity.objects.create(
            user=self.user,
            activity=self.activity_run,
            start=timezone.now(),
            end=timezone.now() + timedelta(hours=1)
        )

        response = self.client.get(self.history_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Handle pagination
        if "results" in response.data:
            self.assertEqual(len(response.data["results"]), 1)
            self.assertEqual(response.data["results"][0]["activity"], self.activity_run.pk)
        else:
            self.assertEqual(len(response.data), 1)
            self.assertEqual(response.data[0]["activity"], self.activity_run.pk)
