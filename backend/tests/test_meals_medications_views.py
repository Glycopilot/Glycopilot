from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.meals.models import Meal, UserMeal
from apps.meals.views import MealViewSet, UserMealViewSet
from apps.medications.models import Medication, UserMedication
from apps.medications.views import MedicationViewSet, UserMedicationViewSet
from apps.users.models import AuthAccount


class MealsMedicationsViewsCoverageTests(TestCase):
    def setUp(self):
        self.user = AuthAccount.objects.create_user(
            email="mm@test.com", password="pass123"
        )
        self.factory = APIRequestFactory()

    def test_meal_viewsets(self):
        meal = Meal.objects.create(meal_id=1, name="Salad")
        request = self.factory.get("/api/meals/reference/")
        force_authenticate(request, user=self.user)
        response = MealViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)

        request = self.factory.post(
            "/api/meals/log/",
            {"meal_id": meal.meal_id, "taken_at": timezone.now()},
        )
        force_authenticate(request, user=self.user)
        response = UserMealViewSet.as_view({"post": "create"})(request)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(UserMeal.objects.filter(user=self.user).exists())

        request = self.factory.get("/api/meals/log/")
        force_authenticate(request, user=self.user)
        response = UserMealViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)

    def test_medication_viewsets(self):
        medication = Medication.objects.create(
            medication_id=1,
            name="Metformin",
            type="tablet",
            dosage="500mg",
        )
        request = self.factory.get("/api/medications/reference/")
        force_authenticate(request, user=self.user)
        response = MedicationViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)

        request = self.factory.post(
            "/api/medications/log/",
            {
                "medication_id": medication.medication_id,
                "start_date": timezone.now().date(),
                "statut": True,
            },
        )
        force_authenticate(request, user=self.user)
        response = UserMedicationViewSet.as_view({"post": "create"})(request)
        self.assertEqual(response.status_code, 201)
        self.assertTrue(UserMedication.objects.filter(user=self.user).exists())

        request = self.factory.get("/api/medications/log/")
        force_authenticate(request, user=self.user)
        response = UserMedicationViewSet.as_view({"get": "list"})(request)
        self.assertEqual(response.status_code, 200)
