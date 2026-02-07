from django.test import TestCase

from apps.alerts.models import AlertRule
from apps.devices.models import Device
from django.contrib import admin

from apps.doctors.models import (
    InvitationStatus,
    PatientCareTeam,
    Specialty,
    VerificationStatus,
)
from apps.doctors.serializers import PatientCareTeamSerializer
from apps.doctors.admin import DoctorProfileAdmin
from apps.profiles.admin import PatientProfileAdmin
from apps.profiles.models import Profile, Role
from apps.users.models import AuthAccount, User


class ModelsMiscCoverageTests(TestCase):
    def test_auth_account_manager_and_role(self):
        role = Role.objects.create(name="PATIENT")
        identity = User.objects.create(first_name="Jean", last_name="Dupont")
        profile = Profile.objects.create(user=identity, role=role)
        account = AuthAccount.objects.create_user(
            email="role@test.com", password="pass123", user_identity=identity
        )
        self.assertEqual(account.role, "patient")
        self.assertEqual(str(account), "role@test.com")
        self.assertEqual(str(identity), "Jean Dupont")
        self.assertEqual(str(role), "PATIENT")
        self.assertEqual(str(profile), f"{identity} - {role.name}")

        identity2 = User.objects.create(first_name="No", last_name="Role")
        account2 = AuthAccount.objects.create_user(
            email="norole@test.com", password="pass123", user_identity=identity2
        )
        self.assertIsNone(account2.role)

        superuser = AuthAccount.objects.create_superuser(
            email="super@test.com", password="pass123"
        )
        self.assertTrue(superuser.is_superuser)

        with self.assertRaises(ValueError):
            AuthAccount.objects.create_user(email="", password="x")

    def test_care_team_str_and_statuses(self):
        patient_role = Role.objects.create(name="PATIENT")
        doctor_role = Role.objects.create(name="DOCTOR")
        verification = VerificationStatus.objects.create(label="VERIFIED")
        invitation_status = InvitationStatus.objects.create(label="PENDING")

        patient_identity = User.objects.create(first_name="Pat", last_name="One")
        patient_profile = Profile.objects.create(user=patient_identity, role=patient_role)
        patient_profile.patient_profile.diabetes_type = "TYPE1"
        patient_profile.patient_profile.save()

        doctor_identity = User.objects.create(first_name="Doc", last_name="One")
        doctor_account = AuthAccount.objects.create_user(
            email="doc1@test.com", password="pass123", user_identity=doctor_identity
        )
        doctor_profile = Profile.objects.create(user=doctor_identity, role=doctor_role)
        doctor_profile.doctor_profile.license_number = "LIC-STR"
        doctor_profile.doctor_profile.verification_status = verification
        doctor_profile.doctor_profile.save()

        care = PatientCareTeam.objects.create(
            patient_profile=patient_profile.patient_profile,
            member_profile=doctor_profile,
            status=invitation_status,
            role="REFERENT_DOCTOR",
        )
        self.assertIn("REFERENT_DOCTOR", str(care))
        self.assertEqual(str(verification), "VERIFIED")
        self.assertEqual(str(invitation_status), "PENDING")

        rule = AlertRule.objects.create(code="ALERT", name="Alert")
        self.assertEqual(str(rule), "ALERT - Alert")

        device = Device.objects.create(user=doctor_account, name="Dex")
        self.assertEqual(str(device), "Dex (other)")

        specialty = Specialty.objects.create(name="Cardio")
        doctor_profile.doctor_profile.specialty = specialty
        doctor_profile.doctor_profile.save()
        self.assertEqual(str(doctor_profile.doctor_profile), "Dr. LIC-STR")
        self.assertEqual(
            str(patient_profile.patient_profile), f"Patient: {patient_identity}"
        )
        self.assertEqual(str(specialty), "Cardio")

        admin_site = admin.site
        doc_admin = DoctorProfileAdmin(doctor_profile.doctor_profile.__class__, admin_site)
        self.assertEqual(doc_admin.get_user(doctor_profile.doctor_profile), doctor_identity)

        patient_admin = PatientProfileAdmin(
            patient_profile.patient_profile.__class__, admin_site
        )
        self.assertEqual(
            patient_admin.get_user(patient_profile.patient_profile), patient_identity
        )

        serializer = PatientCareTeamSerializer(care)
        data = serializer.data
        self.assertIn("member_details", data)
        self.assertIn("patient_details", data)

        care_missing_member = PatientCareTeam.objects.create(
            patient_profile=patient_profile.patient_profile,
            member_profile=None,
            status=invitation_status,
            role="FAMILY",
        )
        data = PatientCareTeamSerializer(care_missing_member).data
        self.assertIsNone(data["member_details"])

        class DummyObj:
            patient_profile = None

        serializer = PatientCareTeamSerializer()
        self.assertIsNone(serializer.get_patient_details(DummyObj()))

        class DummyProfile:
            user = None

        class DummyPatient:
            profile = DummyProfile()

        class DummyObj2:
            patient_profile = DummyPatient()

        self.assertIsNone(serializer.get_patient_details(DummyObj2()))
