"""
Tests : fonctionnalités Proche.

Couvre :
  - add_family_member : sans email (shell), avec nouvel email (PENDING), avec email existant (ACTIVE)
  - activate_proche_account : token valide, token invalide
  - update_member : PATCH champs, protection patient
  - Endpoints lecture proche : my-linked-patient, proche-glycemia, proche-dashboard
"""
from unittest.mock import patch

from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APIClient

from apps.auth.tokens import email_verification_token
from apps.doctors.models import InvitationStatus, PatientCareTeam
from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_patient(email, password="pass123"):
    Role.objects.get_or_create(name="PATIENT")
    identity = UserIdentity.objects.create(first_name="Patient", last_name="Test")
    account = User.objects.create_user(email=email, password=password, user_identity=identity)
    Profile.objects.create(user=identity, role=Role.objects.get(name="PATIENT"))
    return account


def _make_proche_account(email, patient_account, role_name="FAMILY"):
    """Crée un proche avec compte actif et lien PatientCareTeam ACTIVE."""
    Role.objects.get_or_create(name=role_name)
    InvitationStatus.objects.get_or_create(label="ACTIVE")
    identity = UserIdentity.objects.create(first_name="Proche", last_name="Test")
    account = User.objects.create_user(email=email, password="pass123", user_identity=identity)
    role_obj = Role.objects.get(name=role_name)
    member_profile = Profile.objects.create(user=identity, role=role_obj)
    patient_profile = (
        patient_account.user.profiles.filter(role__name="PATIENT")
        .first().patient_profile
    )
    PatientCareTeam.objects.create(
        patient_profile=patient_profile,
        member_profile=member_profile,
        role=role_name,
        relation_type="Conjoint",
        status=InvitationStatus.objects.get(label="ACTIVE"),
    )
    return account


class AddFamilyMemberTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        Role.objects.get_or_create(name="PATIENT")
        Role.objects.get_or_create(name="FAMILY")
        Role.objects.get_or_create(name="CAREGIVER")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")
        self.patient = _make_patient("patient@test.com")
        r = self.client.post("/api/auth/login/", {"email": "patient@test.com", "password": "pass123"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

    def test_add_family_without_email_creates_shell_active(self):
        resp = self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Marie", "last_name": "Proche", "role": "FAMILY",
            "relation_type": "Mère",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "ACTIVE")
        self.assertFalse(resp.data["invitation_sent"])
        entry = PatientCareTeam.objects.get(id_team_member=resp.data["id"])
        self.assertFalse(User.objects.filter(user=entry.member_profile.user).exists())

    def test_add_family_with_new_email_creates_pending_account(self, ):
        resp = self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Luc", "last_name": "Proche",
            "email": "luc@proche.com", "role": "FAMILY",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "PENDING")
        self.assertTrue(resp.data["invitation_sent"])
        account = User.objects.get(email="luc@proche.com")
        self.assertFalse(account.is_active)

    def test_add_family_with_new_email_sends_invitation_email(self):
        from django.core import mail
        resp = self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Eva", "last_name": "Proche",
            "email": "eva@proche.com", "role": "FAMILY",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("proche/activate", mail.outbox[0].body)

    def test_add_family_with_existing_email_links_and_activates(self):
        # Créer un compte existant
        existing_identity = UserIdentity.objects.create(first_name="Ex", last_name="User")
        User.objects.create_user(email="existing@test.com", password="x", user_identity=existing_identity)
        Role.objects.get_or_create(name="PATIENT")
        Profile.objects.create(user=existing_identity, role=Role.objects.get(name="PATIENT"))

        resp = self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Ex", "last_name": "User",
            "email": "existing@test.com", "role": "FAMILY",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], "ACTIVE")

    def test_add_family_invalid_role_returns_400(self):
        resp = self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "X", "last_name": "Y", "role": "DOCTOR",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_family_missing_name_returns_400(self):
        resp = self.client.post("/api/doctors/care-team/add-family/", {"role": "FAMILY"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_family_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "X", "last_name": "Y",
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class ActivateProcheTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        Role.objects.get_or_create(name="PATIENT")
        Role.objects.get_or_create(name="FAMILY")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")

    def _make_pending_proche(self, email="proche@test.com"):
        identity = UserIdentity.objects.create(first_name="Proche", last_name="Inactif")
        account = User.objects.create_user(email=email, password=None, user_identity=identity)
        account.is_active = False
        account.save(update_fields=["is_active"])
        return account

    def test_activate_valid_token_activates_account(self):
        account = self._make_pending_proche()
        uid = urlsafe_base64_encode(force_bytes(account.pk))
        token = email_verification_token.make_token(account)

        resp = self.client.post("/api/doctors/care-team/activate-proche/", {
            "uid": uid, "token": token, "password": "NewPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        account.refresh_from_db()
        self.assertTrue(account.is_active)
        self.assertTrue(account.check_password("NewPass123!"))

    def test_activate_sets_pending_careteam_to_active(self):
        patient = _make_patient("patient_act@test.com")
        proche_account = self._make_pending_proche("proche_act@test.com")
        role_obj = Role.objects.get(name="FAMILY")
        member_profile = Profile.objects.create(user=proche_account.user, role=role_obj)
        patient_profile = patient.user.profiles.filter(role__name="PATIENT").first().patient_profile
        pending_status = InvitationStatus.objects.get(label="PENDING")
        PatientCareTeam.objects.create(
            patient_profile=patient_profile,
            member_profile=member_profile,
            role="FAMILY",
            status=pending_status,
        )

        uid = urlsafe_base64_encode(force_bytes(proche_account.pk))
        token = email_verification_token.make_token(proche_account)
        self.client.post("/api/doctors/care-team/activate-proche/", {
            "uid": uid, "token": token, "password": "NewPass123!",
        })

        entry = PatientCareTeam.objects.get(member_profile=member_profile)
        self.assertEqual(entry.status.label, "ACTIVE")

    def test_activate_invalid_token_returns_400(self):
        account = self._make_pending_proche()
        uid = urlsafe_base64_encode(force_bytes(account.pk))
        resp = self.client.post("/api/doctors/care-team/activate-proche/", {
            "uid": uid, "token": "badtoken", "password": "x",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_missing_fields_returns_400(self):
        resp = self.client.post("/api/doctors/care-team/activate-proche/", {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_token_cannot_be_reused(self):
        account = self._make_pending_proche()
        uid = urlsafe_base64_encode(force_bytes(account.pk))
        token = email_verification_token.make_token(account)
        self.client.post("/api/doctors/care-team/activate-proche/", {
            "uid": uid, "token": token, "password": "NewPass123!",
        })
        resp = self.client.post("/api/doctors/care-team/activate-proche/", {
            "uid": uid, "token": token, "password": "NewPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class UpdateMemberTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        Role.objects.get_or_create(name="PATIENT")
        Role.objects.get_or_create(name="FAMILY")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        self.patient = _make_patient("patient_upd@test.com")
        r = self.client.post("/api/auth/login/", {"email": "patient_upd@test.com", "password": "pass123"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

        # Ajouter un proche
        resp = self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Ancien", "last_name": "Nom",
            "phone_number": "0600000000", "role": "FAMILY", "relation_type": "Frère",
        })
        self.team_member_id = resp.data["id"]

    def test_update_member_modifies_fields(self):
        resp = self.client.patch("/api/doctors/care-team/update-member/", {
            "id_team_member": self.team_member_id,
            "first_name": "Nouveau",
            "phone_number": "0611111111",
            "relation_type": "Sœur",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["first_name"], "Nouveau")
        self.assertEqual(resp.data["phone_number"], "0611111111")
        self.assertEqual(resp.data["relation_type"], "Sœur")

    def test_update_member_partial_update_only_changes_provided_fields(self):
        resp = self.client.patch("/api/doctors/care-team/update-member/", {
            "id_team_member": self.team_member_id,
            "relation_type": "Cousin",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["relation_type"], "Cousin")
        self.assertEqual(resp.data["first_name"], "Ancien")  # inchangé

    def test_update_member_missing_id_returns_400(self):
        resp = self.client.patch("/api/doctors/care-team/update-member/", {
            "first_name": "X",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_member_wrong_patient_returns_404(self):
        other_patient = _make_patient("other@test.com")
        r = self.client.post("/api/auth/login/", {"email": "other@test.com", "password": "pass123"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        resp = self.client.patch("/api/doctors/care-team/update-member/", {
            "id_team_member": self.team_member_id,
            "first_name": "Hack",
        })
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class ProcheEndpointsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        Role.objects.get_or_create(name="PATIENT")
        Role.objects.get_or_create(name="FAMILY")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        self.patient = _make_patient("pat_proche@test.com")
        self.proche = _make_proche_account("proche_ep@test.com", self.patient)
        r = self.client.post("/api/auth/login/", {"email": "proche_ep@test.com", "password": "pass123"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

    def test_my_linked_patient_returns_patient_info(self):
        resp = self.client.get("/api/doctors/care-team/my-linked-patient/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("patient_user_id", resp.data)
        self.assertIn("first_name", resp.data)
        self.assertEqual(resp.data["relation_type"], "Conjoint")

    def test_proche_glycemia_returns_list(self):
        resp = self.client.get("/api/doctors/care-team/proche-glycemia/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_proche_dashboard_returns_dict(self):
        resp = self.client.get("/api/doctors/care-team/proche-dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("glucose", resp.data)
        self.assertIn("alerts", resp.data)

    def test_patient_cannot_access_proche_endpoints(self):
        r = self.client.post("/api/auth/login/", {"email": "pat_proche@test.com", "password": "pass123"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        resp = self.client.get("/api/doctors/care-team/my-linked-patient/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_proche_endpoints_require_authentication(self):
        self.client.credentials()
        for url in [
            "/api/doctors/care-team/my-linked-patient/",
            "/api/doctors/care-team/proche-glycemia/",
            "/api/doctors/care-team/proche-dashboard/",
        ]:
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED, url)
