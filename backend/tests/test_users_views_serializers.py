from unittest.mock import Mock

from django.test import TestCase
from django.urls import reverse
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIRequestFactory, APIClient, force_authenticate

from apps.doctors.models import (
    DoctorProfile,
    InvitationStatus,
    PatientCareTeam,
    VerificationStatus,
)
from apps.profiles.models import Profile, Role
from apps.users.models import AuthAccount, User
from apps.users.serializers import ProfileSerializer as UserProfileSerializer
from apps.users.serializers import UserSerializer
from apps.users.views import UserViewSet


class UsersViewsSerializersCoverageTests(TestCase):
    def setUp(self):
        self.patient_role = Role.objects.create(name="PATIENT")
        self.doctor_role = Role.objects.create(name="DOCTOR")
        self.admin_role = Role.objects.create(name="ADMIN")
        InvitationStatus.objects.get_or_create(label="PENDING")
        self.verified_status, _ = VerificationStatus.objects.get_or_create(
            label="VERIFIED"
        )

        self.identity = User.objects.create(first_name="Pat", last_name="User")
        self.account = AuthAccount.objects.create_user(
            email="pat@example.com", password="pass123", user_identity=self.identity
        )
        self.patient_profile = Profile.objects.create(
            user=self.identity, role=self.patient_role
        )

    def test_user_serializer_patient_details(self):
        data = UserSerializer(self.identity).data
        self.assertIn("patient_details", data)

        other = User.objects.create(first_name="No", last_name="Profile")
        data = UserSerializer(other).data
        self.assertIsNone(data["patient_details"])

    def test_profile_serializer_update_patient_profile(self):
        serializer = UserProfileSerializer(
            self.patient_profile,
            data={"patient_details": {"diabetes_type": "TYPE1"}},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        serializer.save()
        self.patient_profile.refresh_from_db()
        self.assertEqual(self.patient_profile.patient_profile.diabetes_type, "TYPE1")

        user_serializer = UserSerializer(
            self.identity, data={"profiles": [{"label": "x"}]}, partial=True
        )
        self.assertTrue(user_serializer.is_valid(), user_serializer.errors)
        user_serializer.save()

    def test_user_viewset_me_get_and_patch(self):
        factory = APIRequestFactory()
        view = UserViewSet.as_view({"get": "me"})
        request = factory.get("/api/users/me/")
        force_authenticate(request, user=self.account)
        response = view(request)
        self.assertEqual(response.status_code, 200)

        doctor_identity = User.objects.create(first_name="Doc", last_name="User")
        doctor_account = AuthAccount.objects.create_user(
            email="doc@example.com", password="pass123", user_identity=doctor_identity
        )
        doctor_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doctor_profile.doctor_profile.license_number = "LIC-123"
        doctor_profile.doctor_profile.verification_status = self.verified_status
        doctor_profile.doctor_profile.save()

        patch_view = UserViewSet.as_view({"patch": "me"})
        request = factory.patch(
            "/api/users/me/",
            {
                "patient_details": {
                    "diabetes_type": "TYPE2",
                    "diagnosis_date": "2020-01-01",
                },
                "medical_id": "LIC-123",
                "phone_number": "01020304",
            },
            format="json",
        )
        force_authenticate(request, user=self.account)
        response = patch_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            PatientCareTeam.objects.filter(
                patient_profile=self.patient_profile.patient_profile,
                member_profile=doctor_profile,
            ).exists()
        )

    def test_user_viewset_me_medical_id_errors(self):
        factory = APIRequestFactory()
        view = UserViewSet.as_view({"patch": "me"})

        # No patient profile for doctor-only user
        doctor_identity = User.objects.create(first_name="Only", last_name="Doctor")
        doctor_account = AuthAccount.objects.create_user(
            email="onlydoc@example.com", password="pass123", user_identity=doctor_identity
        )
        Profile.objects.create(user=doctor_identity, role=self.doctor_role)
        doctor_identity.profiles.first().doctor_profile.verification_status = (
            self.verified_status
        )
        doctor_identity.profiles.first().doctor_profile.save()
        request = factory.patch("/api/users/me/", {"medical_id": "LIC-404"})
        force_authenticate(request, user=doctor_account)
        response = view(request)
        self.assertEqual(response.status_code, 400)

        # Unknown doctor license
        request = factory.patch("/api/users/me/", {"medical_id": "LIC-404"})
        force_authenticate(request, user=self.account)
        response = view(request)
        self.assertEqual(response.status_code, 404)

    def test_user_viewset_permissions(self):
        viewset = UserViewSet()
        viewset.request = Mock(user=self.account)
        serializer = Mock()

        with self.assertRaises(PermissionDenied):
            viewset.perform_create(serializer)

        admin_identity = User.objects.create(first_name="Admin", last_name="User")
        admin_account = AuthAccount.objects.create_user(
            email="admin@example.com", password="pass123", user_identity=admin_identity
        )
        Profile.objects.create(user=admin_identity, role=self.admin_role)
        viewset.request = Mock(user=admin_account)
        viewset.perform_create(serializer)
        serializer.save.assert_called()

        class NoUser:
            is_superuser = False

        self.assertFalse(viewset._is_admin(NoUser()))

    def test_user_viewset_get_queryset_and_update(self):
        viewset = UserViewSet()
        viewset.request = Mock(user=self.account)
        qs = viewset.get_queryset()
        self.assertEqual(list(qs), [self.identity])

        admin_identity = User.objects.create(first_name="Admin", last_name="User")
        admin_account = AuthAccount.objects.create_user(
            email="admin2@example.com", password="pass123", user_identity=admin_identity
        )
        Profile.objects.create(user=admin_identity, role=self.admin_role)
        viewset.request = Mock(user=admin_account)
        qs = viewset.get_queryset()
        self.assertGreaterEqual(qs.count(), 2)

        super_identity = User.objects.create(first_name="Super", last_name="Admin")
        super_account = AuthAccount.objects.create_user(
            email="super2@example.com",
            password="pass123",
            user_identity=super_identity,
            is_superuser=True,
        )
        self.assertTrue(viewset._is_admin(super_account))

        serializer = Mock()
        serializer.instance = self.identity
        viewset.request = Mock(user=self.account)
        viewset.perform_update(serializer)
        serializer.save.assert_called()

        viewset.request = Mock(user=admin_account)
        viewset.perform_update(serializer)
        serializer.save.assert_called()

        other_identity = User.objects.create(first_name="Other", last_name="User")
        other_account = AuthAccount.objects.create_user(
            email="other@example.com", password="pass123", user_identity=other_identity
        )
        viewset.request = Mock(user=other_account)
        with self.assertRaises(PermissionDenied):
            viewset.perform_update(serializer)
