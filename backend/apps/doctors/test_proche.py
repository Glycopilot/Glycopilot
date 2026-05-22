"""
Tests : fonctionnalités Proche.

Couvre :
  - add_family_member : sans email (shell), avec nouvel email (PENDING), avec email existant (ACTIVE),
    anti-doublon (400), already_proche (409)
  - validate_proche_code : code valide, code invalide, champs manquants
  - activate_proche_account : code valide (active + mot de passe), code invalide, réutilisation
  - update_member : PATCH champs, protection patient
  - my-team : pending_family inclus
  - Endpoints lecture proche : my-linked-patient, proche-glycemia, proche-dashboard,
    proche-medications
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.test import APIClient
from django.test import TestCase

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

    def test_add_family_with_new_email_creates_pending_account(self):
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

    def test_add_family_with_existing_email_links_and_activates(self):
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

    def test_add_family_duplicate_email_returns_400(self):
        # Première invitation
        self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Dup", "last_name": "Test",
            "email": "dup@proche.com", "role": "FAMILY",
        })
        # Deuxième invitation avec le même email → anti-doublon
        resp = self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Dup", "last_name": "Test",
            "email": "dup@proche.com", "role": "FAMILY",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_add_family_already_proche_returns_409(self):
        # Créer un autre patient
        other_patient = _make_patient("other_patient@test.com")
        # Créer un proche actif lié à l'autre patient
        proche_email = "already_proche@test.com"
        _make_proche_account(proche_email, other_patient)

        # Notre patient tente d'inviter ce proche qui est déjà actif ailleurs
        resp = self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Already", "last_name": "Proche",
            "email": proche_email, "role": "FAMILY",
        })
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(resp.data.get("code"), "already_proche")

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


class ValidateProcheCodeTests(TestCase):
    """Tests pour POST /api/doctors/care-team/validate-proche-code/"""

    def setUp(self):
        self.client = APIClient()
        Role.objects.get_or_create(name="PATIENT")
        Role.objects.get_or_create(name="FAMILY")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")

        # Créer un patient et inviter un proche pour obtenir un code
        self.patient = _make_patient("patient_val@test.com")
        auth_client = APIClient()
        r = auth_client.post("/api/auth/login/", {"email": "patient_val@test.com", "password": "pass123"})
        auth_client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        auth_client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Code", "last_name": "Test",
            "email": "proche_val@test.com", "role": "FAMILY",
        })
        self.proche_email = "proche_val@test.com"
        self.code = PatientCareTeam.objects.get(invitation_email=self.proche_email).activation_code

    def test_valid_code_returns_true(self):
        resp = self.client.post("/api/doctors/care-team/validate-proche-code/", {
            "email": self.proche_email,
            "code": self.code,
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["valid"])

    def test_invalid_code_returns_400(self):
        resp = self.client.post("/api/doctors/care-team/validate-proche-code/", {
            "email": self.proche_email,
            "code": "XXXXXX",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_fields_returns_400(self):
        resp = self.client.post("/api/doctors/care-team/validate-proche-code/", {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unknown_email_returns_400(self):
        resp = self.client.post("/api/doctors/care-team/validate-proche-code/", {
            "email": "unknown@test.com",
            "code": self.code,
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_endpoint_is_public(self):
        # Pas de credentials requis (authentication_classes=[])
        resp = self.client.post("/api/doctors/care-team/validate-proche-code/", {
            "email": self.proche_email,
            "code": self.code,
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class ActivateProcheTests(TestCase):
    """Tests pour POST /api/doctors/care-team/activate-proche/ (flow email+code+password)."""

    def setUp(self):
        self.client = APIClient()
        Role.objects.get_or_create(name="PATIENT")
        Role.objects.get_or_create(name="FAMILY")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")

        # Créer un patient et inviter un proche → PENDING entry avec activation_code
        self.patient = _make_patient("patient_act@test.com")
        auth_client = APIClient()
        r = auth_client.post("/api/auth/login/", {"email": "patient_act@test.com", "password": "pass123"})
        auth_client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        auth_client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Proche", "last_name": "Inactif",
            "email": "proche_act@test.com", "role": "FAMILY",
        })
        self.proche_email = "proche_act@test.com"
        self.code = PatientCareTeam.objects.get(invitation_email=self.proche_email).activation_code

    def test_activate_valid_code_activates_account(self):
        resp = self.client.post("/api/doctors/care-team/activate-proche/", {
            "email": self.proche_email,
            "code": self.code,
            "password": "NewPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        account = User.objects.get(email=self.proche_email)
        self.assertTrue(account.is_active)
        self.assertTrue(account.check_password("NewPass123!"))

    def test_activate_sets_careteam_status_to_active(self):
        self.client.post("/api/doctors/care-team/activate-proche/", {
            "email": self.proche_email,
            "code": self.code,
            "password": "NewPass123!",
        })
        entry = PatientCareTeam.objects.get(invitation_email=self.proche_email)
        self.assertEqual(entry.status.label, "ACTIVE")
        self.assertIsNone(entry.activation_code)

    def test_activate_invalid_code_returns_400(self):
        resp = self.client.post("/api/doctors/care-team/activate-proche/", {
            "email": self.proche_email,
            "code": "BADCODE",
            "password": "NewPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_missing_fields_returns_400(self):
        resp = self.client.post("/api/doctors/care-team/activate-proche/", {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_activate_code_cannot_be_reused(self):
        self.client.post("/api/doctors/care-team/activate-proche/", {
            "email": self.proche_email,
            "code": self.code,
            "password": "NewPass123!",
        })
        resp = self.client.post("/api/doctors/care-team/activate-proche/", {
            "email": self.proche_email,
            "code": self.code,
            "password": "NewPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_endpoint_is_public(self):
        resp = self.client.post("/api/doctors/care-team/activate-proche/", {
            "email": self.proche_email,
            "code": self.code,
            "password": "NewPass123!",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class UpdateMemberTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        Role.objects.get_or_create(name="PATIENT")
        Role.objects.get_or_create(name="FAMILY")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        self.patient = _make_patient("patient_upd@test.com")
        r = self.client.post("/api/auth/login/", {"email": "patient_upd@test.com", "password": "pass123"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

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
        _make_patient("other@test.com")
        r = self.client.post("/api/auth/login/", {"email": "other@test.com", "password": "pass123"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        resp = self.client.patch("/api/doctors/care-team/update-member/", {
            "id_team_member": self.team_member_id,
            "first_name": "Hack",
        })
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)


class MyTeamTests(TestCase):
    """Tests pour GET /api/doctors/care-team/my-team/ incluant pending_family."""

    def setUp(self):
        self.client = APIClient()
        Role.objects.get_or_create(name="PATIENT")
        Role.objects.get_or_create(name="FAMILY")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")
        self.patient = _make_patient("patient_team@test.com")
        r = self.client.post("/api/auth/login/", {"email": "patient_team@test.com", "password": "pass123"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

    def test_my_team_includes_pending_family_key(self):
        resp = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("pending_family", resp.data)
        self.assertIn("family", resp.data)
        self.assertIn("doctors", resp.data)
        self.assertIn("pending_doctor_invites", resp.data)

    def test_pending_family_contains_invited_proche(self):
        # Inviter un proche avec email → statut PENDING
        self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Pending", "last_name": "Proche",
            "email": "pending_proche@test.com", "role": "FAMILY",
        })
        resp = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data["pending_family"]), 1)
        self.assertEqual(len(resp.data["family"]), 0)

    def test_active_family_is_separate_from_pending(self):
        # Proche sans email → ACTIVE immédiatement
        self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Active", "last_name": "Proche", "role": "FAMILY",
        })
        # Proche avec email → PENDING
        self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Pend", "last_name": "Proche",
            "email": "pend2@test.com", "role": "FAMILY",
        })
        resp = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(len(resp.data["family"]), 1)
        self.assertEqual(len(resp.data["pending_family"]), 1)

    def test_serializer_status_returns_string_not_pk(self):
        # Vérifier que status est "ACTIVE"/"PENDING" (StringRelatedField) et non un entier
        self.client.post("/api/doctors/care-team/add-family/", {
            "first_name": "Str", "last_name": "Status", "role": "FAMILY",
        })
        resp = self.client.get("/api/doctors/care-team/my-team/")
        active_family = resp.data["family"]
        self.assertEqual(len(active_family), 1)
        status_val = active_family[0]["status"]
        self.assertIsInstance(status_val, str)
        self.assertEqual(status_val, "ACTIVE")


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

    def test_proche_medications_returns_list(self):
        resp = self.client.get("/api/doctors/care-team/proche-medications/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_proche_medications_empty_when_no_intakes(self):
        resp = self.client.get("/api/doctors/care-team/proche-medications/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])

    def test_patient_cannot_access_proche_endpoints(self):
        r = self.client.post("/api/auth/login/", {"email": "pat_proche@test.com", "password": "pass123"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        for url in [
            "/api/doctors/care-team/my-linked-patient/",
            "/api/doctors/care-team/proche-glycemia/",
            "/api/doctors/care-team/proche-dashboard/",
            "/api/doctors/care-team/proche-medications/",
        ]:
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN, url)

    def test_proche_endpoints_require_authentication(self):
        self.client.credentials()
        for url in [
            "/api/doctors/care-team/my-linked-patient/",
            "/api/doctors/care-team/proche-glycemia/",
            "/api/doctors/care-team/proche-dashboard/",
            "/api/doctors/care-team/proche-medications/",
        ]:
            resp = self.client.get(url)
            self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED, url)
