from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Doctor

User = get_user_model()

class DoctorAssociationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient = User.objects.create_user(username="patient", email="patient@test.com", password="password", role=User.Role.PATIENT)
        self.doctor_user = User.objects.create_user(username="doctor", email="doctor@test.com", password="password", role=User.Role.DOCTOR)
        self.doctor = Doctor.objects.create(user=self.doctor_user, licence_number="L12345", valide=True)
        self.client.force_authenticate(user=self.doctor_user)

    def test_create_association_and_retrieve(self):
        # Create association manually by assigning doctor to patient
        self.patient.medical_id = self.doctor
        self.patient.save()

        response = self.client.get("/api/medecins/medecins-patients/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertIn("patients_par_medecin", data)
        self.assertIn("medecins_avec_patients", data)
        
        # Check content
        # We expect a list of objects matchings {doctor: ..., patients: [...]}
        patients_data = data["patients_par_medecin"]
        self.assertTrue(len(patients_data) > 0)
        self.assertEqual(patients_data[0]["doctor"]["licence_number"], "L12345")
        self.assertEqual(len(patients_data[0]["patients"]), 1)
        self.assertEqual(patients_data[0]["patients"][0]["email"], "patient@test.com")

class UserMeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="user", email="user@test.com", password="password")
        self.client.force_authenticate(user=self.user)

    def test_get_me(self):
        response = self.client.get("/api/users/me/")
        # If the 'me' action is not registered or found on the root router, this might fail or need /users/me/
        # UserViewSet is registered at 'api/users' probably (depends on main urls.py).
        # Assuming the standard router.register(r'users', UserViewSet)
        
        # We need to verify where users are registered.
        # But let's assume standard REST, so /api/users/me/ should work with @action
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["email"], "user@test.com")
