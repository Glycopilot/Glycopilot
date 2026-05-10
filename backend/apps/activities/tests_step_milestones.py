from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .models import UserMilestonePoints, UserStepDayCheckpoint
from .services.step_milestones import process_daily_steps_sync

User = get_user_model()


class StepMilestoneServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="steps@test.com",
            password="testpass123",
        )

    def test_first_sync_no_points_below_block(self):
        r = process_daily_steps_sync(self.user, date(2026, 5, 10), 50)
        self.assertEqual(r.points_earned, 0)
        self.assertEqual(r.milestones_crossed, 0)
        self.assertEqual(r.steps, 50)

    def test_cross_one_block(self):
        process_daily_steps_sync(self.user, date(2026, 5, 10), 50)
        r = process_daily_steps_sync(self.user, date(2026, 5, 10), 120)
        self.assertEqual(r.milestones_crossed, 1)
        self.assertEqual(r.points_earned, 5)
        self.assertEqual(r.total_milestone_points, 5)

    def test_cross_two_blocks_at_once(self):
        r = process_daily_steps_sync(self.user, date(2026, 5, 10), 250)
        self.assertEqual(r.milestones_crossed, 2)
        self.assertEqual(r.points_earned, 10)


class StepsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="api@test.com",
            password="testpass123",
        )
        self.client.force_authenticate(self.user)

    def test_sync_requires_auth(self):
        self.client.force_authenticate(user=None)
        r = self.client.post("/api/activities/steps/sync/", {"steps": 100}, format="json")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_sync_and_state(self):
        r = self.client.post("/api/activities/steps/sync/", {"steps": 200}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["milestones_crossed"], 2)
        self.assertEqual(r.data["points_earned"], 10)
        s = self.client.get("/api/activities/steps/state/")
        self.assertEqual(s.status_code, status.HTTP_200_OK)
        self.assertEqual(s.data["reported_steps_today"], 200)
        self.assertEqual(s.data["total_milestone_points"], 10)
