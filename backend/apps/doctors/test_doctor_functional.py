"""
Tests fonctionnels — Application MÉDECIN (Glycopilot)
=======================================================
Couvre les scénarios suivants :

  1.  Inscription médecin → message d'attente (pas de token JWT)
  2.  Médecin PENDING ne peut pas se connecter
  3.  Admin valide le médecin → statut VERIFIED
  4.  Admin refuse le médecin → statut REJECTED + raison
  5.  Admin liste les médecins en attente
  6.  Médecin VERIFIED peut se connecter
  7.  Médecin VERIFIED peut voir son équipe (my-team)
  8.  Médecin VERIFIED ajoute un patient existant (add-patient)
  9.  Médecin VERIFIED ne peut pas s'ajouter lui-même
 10.  Médecin non vérifié ne peut pas ajouter un patient
 11.  Médecin accepte une invitation PENDING d'un patient (accept-invitation)
 12.  Patient invite un médecin VERIFIED (invite-doctor)
 13.  Patient ne peut pas inviter un médecin PENDING
 14.  Double invitation → erreur 400
 15.  Médecin accède au dashboard d'un patient dans son équipe (patient-dashboard)
 16.  Médecin ne peut pas voir les données d'un patient hors équipe
 17.  Médecin met à jour l'HbA1c d'un patient (PATCH patients/<id>/medical/)
 18.  Médecin voit les repas du patient (patient-meals)
 19.  Médecin voit les médicaments du patient (patient-medications)
 20.  Médecin voit la glycémie du patient (patient-glycemia)
 21.  Retrait d'un médecin de l'équipe par le patient (remove-member)
 22.  Vue associations médecins-patients (DoctorAssociationsView)
 23.  Vérification service licence : URL non configurée
 24.  Vérification service licence : mock réponse FHIR valide
 25.  Vérification service licence : mock erreur réseau

Comment lancer :
    cd backend
    pytest apps/doctors/test_doctor_functional.py -v
"""

from unittest.mock import MagicMock, patch

import requests as _requests
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.doctors.models import (
    DoctorProfile,
    InvitationStatus,
    PatientCareTeam,
    VerificationStatus,
)
from apps.doctors.services.verification import DoctorVerificationService
from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

AuthAccount = get_user_model()


# ---------------------------------------------------------------------------
# Helpers partagés
# ---------------------------------------------------------------------------

class BaseTestCase(TestCase):
    """Fournit setUp commun (rôles, statuts) et helpers de création rapide."""

    def setUp(self):
        self.client = APIClient()

        # Rôles
        self.role_patient, _ = Role.objects.get_or_create(name="PATIENT")
        self.role_doctor, _ = Role.objects.get_or_create(name="DOCTOR")
        self.role_family, _ = Role.objects.get_or_create(name="FAMILY")
        self.role_superadmin, _ = Role.objects.get_or_create(name="SUPERADMIN")

        # Statuts invitation
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")

        # Statuts vérification médecin
        self.status_verified, _ = VerificationStatus.objects.get_or_create(label="VERIFIED")
        self.status_pending, _ = VerificationStatus.objects.get_or_create(label="PENDING")
        self.status_rejected, _ = VerificationStatus.objects.get_or_create(label="REJECTED")

    def _make_patient(self, email, password="patientPass123!", phone="06000000XX"):
        """Crée un compte patient complet."""
        identity = UserIdentity.objects.create(
            first_name="Patient",
            last_name="Test",
            phone_number=phone,
        )
        account = AuthAccount.objects.create_user(
            email=email, password=password, user_identity=identity
        )
        Profile.objects.create(user=identity, role=self.role_patient)
        return account

    def _make_doctor(self, email, password="doctorPass123!", license_no="LIC-001",
                     verified=True, phone="07000000XX"):
        """Crée un compte médecin avec le statut de vérification voulu."""
        identity = UserIdentity.objects.create(
            first_name="Doctor",
            last_name="Test",
            phone_number=phone,
        )
        account = AuthAccount.objects.create_user(
            email=email, password=password, user_identity=identity
        )
        profile = Profile.objects.create(user=identity, role=self.role_doctor)
        dp = profile.doctor_profile
        dp.license_number = license_no
        dp.verification_status = self.status_verified if verified else self.status_pending
        dp.save()
        return account

    def _make_admin(self, email, password="adminPass123!"):
        """Crée un compte superadmin."""
        identity = UserIdentity.objects.create(first_name="Admin", last_name="Super")
        account = AuthAccount.objects.create_user(
            email=email, password=password, user_identity=identity
        )
        account.is_staff = True
        account.is_superuser = True
        account.save()
        Profile.objects.create(user=identity, role=self.role_superadmin)
        return account

    def _token(self, email, password):
        """Retourne le token JWT access pour un utilisateur."""
        r = self.client.post("/api/auth/login/", {"email": email, "password": password})
        self.assertEqual(r.status_code, 200, msg=f"Login échoué pour {email}: {r.data}")
        return r.data["access"]

    def _auth(self, token):
        """Configure l'Authorization header du client."""
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def _create_active_care_team(self, patient_account, doctor_account):
        """Lie directement un médecin VERIFIED à un patient (statut ACTIVE)."""
        identity = patient_account.user
        patient_profile_obj = (
            identity.profiles.filter(role__name="PATIENT").first().patient_profile
        )
        doctor_profile_obj = doctor_account.user.profiles.filter(role__name="DOCTOR").first()
        active_status, _ = InvitationStatus.objects.get_or_create(label="ACTIVE")
        return PatientCareTeam.objects.create(
            patient_profile=patient_profile_obj,
            member_profile=doctor_profile_obj,
            role="REFERENT_DOCTOR",
            status=active_status,
        )


# ===========================================================================
# 1. Inscription / authentification médecin
# ===========================================================================

class TestDoctorRegistrationAndLogin(BaseTestCase):

    @patch("apps.auth.serializers._verify_email_domain")
    @patch("apps.auth.views._send_verification_link")
    def test_doctor_registration_returns_pending_message(self, mock_mail, mock_mx):
        """
        Scénario 1 : Inscription médecin → message d'attente, pas de token JWT.
        Le compte est créé mais non validé ; aucun token n'est retourné.
        """
        data = {
            "email": "new_doc@test.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "Jean",
            "last_name": "Martin",
            "role": "DOCTOR",
            "license_number": "RPPS-TEST-001",
            "specialty": "Endocrinologie",
        }
        r = self.client.post("/api/auth/register/", data)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        # Médecin → pas de tokens
        self.assertNotIn("access", r.data)
        self.assertIn("message", r.data)
        self.assertTrue(AuthAccount.objects.filter(email="new_doc@test.com").exists())

    def test_pending_doctor_cannot_login(self):
        """
        Scénario 2 : Médecin PENDING ne peut pas se connecter (statut bloquant).
        """
        self._make_doctor("pending_doc@test.com", verified=False, license_no="LIC-P1")
        r = self.client.post(
            "/api/auth/login/",
            {"email": "pending_doc@test.com", "password": "doctorPass123!"},
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", r.data)

    def test_verified_doctor_can_login(self):
        """
        Scénario 6 : Médecin VERIFIED peut se connecter et reçoit des tokens JWT.
        """
        self._make_doctor("verified_doc@test.com", license_no="LIC-V1")
        r = self.client.post(
            "/api/auth/login/",
            {"email": "verified_doc@test.com", "password": "doctorPass123!"},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("access", r.data)
        self.assertIn("refresh", r.data)

    def test_wrong_password_returns_400(self):
        """Mauvais mot de passe → 400."""
        self._make_doctor("doc_wrongpw@test.com", license_no="LIC-WP")
        r = self.client.post(
            "/api/auth/login/",
            {"email": "doc_wrongpw@test.com", "password": "WrongPassword999!"},
        )
        self.assertNotEqual(r.status_code, status.HTTP_200_OK)


# ===========================================================================
# 2. Vérification admin
# ===========================================================================

class TestAdminDoctorVerification(BaseTestCase):

    def test_admin_validates_doctor(self):
        """
        Scénario 3 : Admin passe le médecin de PENDING à VERIFIED.
        """
        doc = self._make_doctor("doc_toverify@test.com", verified=False, license_no="LIC-TV")
        dp = doc.user.profiles.filter(role__name="DOCTOR").first().doctor_profile

        admin = self._make_admin("admin_val@test.com")
        self._auth(self._token("admin_val@test.com", "adminPass123!"))

        r = self.client.post(f"/api/doctors/verification/{dp.doctor_id}/accept/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        dp.refresh_from_db()
        self.assertEqual(dp.verification_status.label, "VERIFIED")
        self.assertIsNotNone(dp.verified_at)
        self.assertEqual(dp.verified_by_user, admin)

    def test_admin_rejects_doctor_with_reason(self):
        """
        Scénario 4 : Admin refuse le médecin avec un motif → statut REJECTED.
        """
        doc = self._make_doctor("doc_reject@test.com", verified=False, license_no="LIC-REJ")
        dp = doc.user.profiles.filter(role__name="DOCTOR").first().doctor_profile

        self._make_admin("admin_rej@test.com")
        self._auth(self._token("admin_rej@test.com", "adminPass123!"))

        r = self.client.post(
            f"/api/doctors/verification/{dp.doctor_id}/decline/",
            {"rejection_reason": "Documents non conformes"},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        dp.refresh_from_db()
        self.assertEqual(dp.verification_status.label, "REJECTED")
        self.assertEqual(dp.rejection_reason, "Documents non conformes")

    def test_admin_lists_pending_doctors(self):
        """
        Scénario 5 : Admin liste les médecins en attente de vérification.
        """
        self._make_doctor("doc_pend1@test.com", verified=False, license_no="LIC-PD1")
        self._make_doctor("doc_pend2@test.com", verified=False, license_no="LIC-PD2")
        # Ce médecin déjà validé ne doit PAS apparaître
        self._make_doctor("doc_ok@test.com", verified=True, license_no="LIC-OK")

        self._make_admin("admin_list@test.com")
        self._auth(self._token("admin_list@test.com", "adminPass123!"))

        r = self.client.get("/api/doctors/verification/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("results", r.data)
        # Au moins 2 médecins PENDING retournés
        self.assertGreaterEqual(len(r.data["results"]), 2)

    def test_accept_already_verified_doctor_returns_400(self):
        """
        Tenter de valider un médecin déjà VERIFIED → 400.
        """
        doc = self._make_doctor("doc_already@test.com", verified=True, license_no="LIC-ALRDY")
        dp = doc.user.profiles.filter(role__name="DOCTOR").first().doctor_profile

        self._make_admin("admin_av@test.com")
        self._auth(self._token("admin_av@test.com", "adminPass123!"))

        r = self.client.post(f"/api/doctors/verification/{dp.doctor_id}/accept/")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_admin_cannot_verify_doctor(self):
        """
        Un médecin ordinaire ne peut pas valider un autre médecin → 403.
        """
        doc_pending = self._make_doctor("doc_np@test.com", verified=False, license_no="LIC-NP")
        dp = doc_pending.user.profiles.filter(role__name="DOCTOR").first().doctor_profile

        self._make_doctor("doc_ver@test.com", verified=True, license_no="LIC-VER")
        self._auth(self._token("doc_ver@test.com", "doctorPass123!"))

        r = self.client.post(f"/api/doctors/verification/{dp.doctor_id}/accept/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_verify_with_invalid_uuid_returns_400(self):
        """
        UUID invalide dans l'URL → 400.
        """
        self._make_admin("admin_uuid@test.com")
        self._auth(self._token("admin_uuid@test.com", "adminPass123!"))

        r = self.client.post("/api/doctors/verification/not-a-uuid/accept/")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_nonexistent_doctor_returns_404(self):
        """
        Doctor_id inexistant → 404.
        """
        import uuid
        self._make_admin("admin_ne@test.com")
        self._auth(self._token("admin_ne@test.com", "adminPass123!"))

        r = self.client.post(f"/api/doctors/verification/{uuid.uuid4()}/accept/")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)


# ===========================================================================
# 3. Gestion de l'équipe de soin (CareTeam)
# ===========================================================================

class TestCareTeamManagement(BaseTestCase):

    def test_verified_doctor_sees_empty_team(self):
        """
        Scénario 7a : Médecin VERIFIED sans patients → listes vides.
        """
        self._make_doctor("doc_empty@test.com", license_no="LIC-EMPTY")
        self._auth(self._token("doc_empty@test.com", "doctorPass123!"))

        r = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("active_patients", r.data)
        self.assertIn("pending_invites", r.data)
        self.assertEqual(len(r.data["active_patients"]), 0)
        self.assertEqual(len(r.data["pending_invites"]), 0)

    def test_doctor_sees_patient_in_team_after_add(self):
        """
        Scénario 7b : Après add-patient, le patient apparaît dans pending_invites.
        """
        self._make_doctor("doc_seeteam@test.com", license_no="LIC-SEE")
        self._make_patient("pat_seeteam@test.com", phone="0600000091")

        self._auth(self._token("doc_seeteam@test.com", "doctorPass123!"))
        r = self.client.post(
            "/api/doctors/care-team/add-patient/",
            {"email": "pat_seeteam@test.com"},
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)

        r = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data["pending_invites"]), 1)

    def test_verified_doctor_adds_patient_by_email(self):
        """
        Scénario 8 : Médecin VERIFIED ajoute un patient existant par email.
        """
        self._make_doctor("doc_addpat@test.com", license_no="LIC-ADD")
        self._make_patient("pat_to_add@test.com", phone="0600000092")

        self._auth(self._token("doc_addpat@test.com", "doctorPass123!"))
        r = self.client.post(
            "/api/doctors/care-team/add-patient/",
            {"email": "pat_to_add@test.com"},
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", r.data)
        self.assertIn("id_team_member", r.data)

        # Vérification en base
        self.assertTrue(PatientCareTeam.objects.filter(
            member_profile__user=AuthAccount.objects.get(email="doc_addpat@test.com").user,
        ).exists())

    def test_doctor_cannot_add_himself_as_patient(self):
        """
        Scénario 9 : Médecin tente de s'ajouter lui-même → 400.
        """
        self._make_doctor("doc_selfadd@test.com", license_no="LIC-SELF")
        self._auth(self._token("doc_selfadd@test.com", "doctorPass123!"))

        r = self.client.post(
            "/api/doctors/care-team/add-patient/",
            {"email": "doc_selfadd@test.com"},
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unverified_doctor_cannot_login_to_add_patient(self):
        """
        Scénario 10 : Médecin PENDING est bloqué au login → ne peut pas appeler add-patient.
        """
        self._make_doctor("doc_unv_add@test.com", verified=False, license_no="LIC-UNV")
        r = self.client.post(
            "/api/auth/login/",
            {"email": "doc_unv_add@test.com", "password": "doctorPass123!"},
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_adds_unknown_patient_sends_invitation(self):
        """
        Si le patient n'existe pas en base, une invitation par email est envoyée (200).
        """
        self._make_doctor("doc_invite@test.com", license_no="LIC-INV")
        self._auth(self._token("doc_invite@test.com", "doctorPass123!"))

        r = self.client.post(
            "/api/doctors/care-team/add-patient/",
            {"email": "unknown_patient@test.com"},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("invitation", r.data["message"].lower())

    def test_doctor_add_patient_without_email_or_phone_returns_400(self):
        """
        Ni email ni téléphone → 400.
        """
        self._make_doctor("doc_noarg@test.com", license_no="LIC-NOARG")
        self._auth(self._token("doc_noarg@test.com", "doctorPass123!"))

        r = self.client.post("/api/doctors/care-team/add-patient/", {})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_accepts_patient_invitation(self):
        """
        Scénario 11 : Médecin accepte une invitation PENDING envoyée par un patient.
        """
        self._make_doctor("doc_accept@test.com", license_no="LIC-ACC")
        self._make_patient("pat_inviter@test.com", phone="0600000093")

        # Patient invite le médecin
        self._auth(self._token("pat_inviter@test.com", "patientPass123!"))
        r = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc_accept@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        invitation_id = r.data["id_team_member"]

        # Médecin accepte
        self._auth(self._token("doc_accept@test.com", "doctorPass123!"))
        r = self.client.post(
            "/api/doctors/care-team/accept-invitation/",
            {"id_team_member": invitation_id},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data["status"], "ACTIVE")

        # Vérification en base
        entry = PatientCareTeam.objects.get(id_team_member=invitation_id)
        self.assertEqual(entry.status.label, "ACTIVE")

    def test_patient_invites_verified_doctor(self):
        """
        Scénario 12 : Patient invite un médecin VERIFIED → 201.
        """
        self._make_doctor("doc_invitable@test.com", license_no="LIC-INVDOC")
        self._make_patient("pat_invites@test.com", phone="0600000094")

        self._auth(self._token("pat_invites@test.com", "patientPass123!"))
        r = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc_invitable@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED)
        self.assertIn("id_team_member", r.data)

    def test_patient_cannot_invite_pending_doctor(self):
        """
        Scénario 13 : Patient tente d'inviter un médecin PENDING → 400.
        """
        self._make_doctor("doc_pending_inv@test.com", verified=False, license_no="LIC-PENDINV")
        self._make_patient("pat_inv_pend@test.com", phone="0600000095")

        self._auth(self._token("pat_inv_pend@test.com", "patientPass123!"))
        r = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc_pending_inv@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", r.data)
        self.assertIn("n'existe pas", r.data["error"])

    def test_double_invitation_returns_400(self):
        """
        Scénario 14 : Patient invite deux fois le même médecin → 400.
        """
        self._make_doctor("doc_double@test.com", license_no="LIC-DBL")
        self._make_patient("pat_double@test.com", phone="0600000096")

        self._auth(self._token("pat_double@test.com", "patientPass123!"))
        payload = {"email": "doc_double@test.com", "role": "REFERENT_DOCTOR"}
        r1 = self.client.post("/api/doctors/care-team/invite-doctor/", payload)
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)

        r2 = self.client.post("/api/doctors/care-team/invite-doctor/", payload)
        self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patient_cannot_invite_himself_as_doctor(self):
        """
        Patient tente de s'inviter lui-même → 400.
        """
        self._make_patient("pat_self_inv@test.com", phone="0600000097")
        self._auth(self._token("pat_self_inv@test.com", "patientPass123!"))
        r = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "pat_self_inv@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invite_doctor_with_invalid_role_returns_400(self):
        """
        Rôle invalide dans invite-doctor → 400.
        """
        self._make_doctor("doc_badrole@test.com", license_no="LIC-BADR")
        self._make_patient("pat_badrole@test.com", phone="0600000098")

        self._auth(self._token("pat_badrole@test.com", "patientPass123!"))
        r = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc_badrole@test.com", "role": "PATIENT"},
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patient_removes_doctor_from_team(self):
        """
        Scénario 21 : Le patient peut retirer un médecin de son équipe.
        """
        doc = self._make_doctor("doc_remove@test.com", license_no="LIC-REM")
        pat = self._make_patient("pat_remove@test.com", phone="0600000099")

        entry = self._create_active_care_team(pat, doc)

        self._auth(self._token("pat_remove@test.com", "patientPass123!"))
        r = self.client.post(
            "/api/doctors/care-team/remove-member/",
            {"id_team_member": str(entry.id_team_member)},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertFalse(
            PatientCareTeam.objects.filter(id_team_member=entry.id_team_member).exists()
        )

    def test_remove_member_without_id_returns_400(self):
        """
        remove-member sans id_team_member → 400.
        """
        self._make_patient("pat_remno@test.com", phone="0600000100")
        self._auth(self._token("pat_remno@test.com", "patientPass123!"))
        r = self.client.post("/api/doctors/care-team/remove-member/", {})
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)


# ===========================================================================
# 4. Accès aux données patient par le médecin
# ===========================================================================

class TestDoctorPatientDataAccess(BaseTestCase):

    def setUp(self):
        super().setUp()
        self.doc = self._make_doctor("doc_data@test.com", license_no="LIC-DATA")
        self.pat = self._make_patient("pat_data@test.com", phone="0600000101")
        self.entry = self._create_active_care_team(self.pat, self.doc)
        self.doc_token = self._token("doc_data@test.com", "doctorPass123!")
        self.patient_user_id = str(self.pat.user.id_user)

    def test_doctor_views_patient_dashboard(self):
        """
        Scénario 15 : Médecin accède au dashboard de son patient.
        """
        self._auth(self.doc_token)
        r = self.client.get(
            "/api/doctors/care-team/patient-dashboard/",
            {"patient_user_id": self.patient_user_id},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        for key in ("glucose", "alerts", "medication", "nutrition", "activity", "healthScore"):
            self.assertIn(key, r.data)

    def test_doctor_cannot_view_dashboard_without_patient_id(self):
        """
        patient_user_id manquant → 400.
        """
        self._auth(self.doc_token)
        r = self.client.get("/api/doctors/care-team/patient-dashboard/")
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_cannot_view_another_patients_dashboard(self):
        """
        Scénario 16 : Médecin ne peut pas voir les données d'un patient hors équipe.
        """
        other_pat = self._make_patient("other_pat@test.com", phone="0600000102")
        self._auth(self.doc_token)
        r = self.client.get(
            "/api/doctors/care-team/patient-dashboard/",
            {"patient_user_id": str(other_pat.user.id_user)},
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_doctor_views_patient_meals(self):
        """
        Scénario 18 : Médecin accède à l'historique des repas.
        """
        self._auth(self.doc_token)
        r = self.client.get(
            "/api/doctors/care-team/patient-meals/",
            {"patient_user_id": self.patient_user_id},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_doctor_views_patient_medications(self):
        """
        Scénario 19 : Médecin accède aux médicaments du patient.
        """
        self._auth(self.doc_token)
        r = self.client.get(
            "/api/doctors/care-team/patient-medications/",
            {"patient_user_id": self.patient_user_id},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_doctor_views_patient_glycemia(self):
        """
        Scénario 20 : Médecin accède à l'historique glycémie du patient.
        """
        self._auth(self.doc_token)
        r = self.client.get(
            "/api/doctors/care-team/patient-glycemia/",
            {"patient_user_id": self.patient_user_id},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_doctor_updates_patient_hba1c(self):
        """
        Scénario 17 : Médecin met à jour l'HbA1c du patient.
        """
        self._auth(self.doc_token)
        r = self.client.patch(
            f"/api/doctors/patients/{self.patient_user_id}/medical/",
            {"hba1c": "7.2"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        pat_identity = self.pat.user
        profile = pat_identity.profiles.filter(role__name="PATIENT").first()
        self.assertIsNotNone(profile)
        from decimal import Decimal
        self.assertEqual(profile.patient_profile.hba1c, Decimal("7.2"))

    def test_doctor_cannot_update_hba1c_out_of_range(self):
        """
        HbA1c hors plage [4, 15] → 400.
        """
        self._auth(self.doc_token)
        r = self.client.patch(
            f"/api/doctors/patients/{self.patient_user_id}/medical/",
            {"hba1c": "20.0"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_doctor_without_active_relation_cannot_update_hba1c(self):
        """
        Médecin sans relation ACTIVE ne peut pas modifier l'HbA1c.
        """
        self._make_doctor("other_doc_hba@test.com", license_no="LIC-OHBA")
        self._auth(self._token("other_doc_hba@test.com", "doctorPass123!"))
        r = self.client.patch(
            f"/api/doctors/patients/{self.patient_user_id}/medical/",
            {"hba1c": "8.0"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)


# ===========================================================================
# 5. Vue associations (DoctorAssociationsView)
# ===========================================================================

class TestDoctorAssociationsView(BaseTestCase):

    def test_associations_view_returns_expected_keys(self):
        """
        Scénario 22 : GET /api/doctors/medecins-patients/ → clés attendues.
        """
        doc = self._make_doctor("doc_assoc@test.com", license_no="LIC-ASSOC")
        pat = self._make_patient("pat_assoc@test.com", phone="0600000103")
        self._create_active_care_team(pat, doc)

        self._auth(self._token("pat_assoc@test.com", "patientPass123!"))
        r = self.client.get("/api/doctors/medecins-patients/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn("patients_par_medecin", r.data)
        self.assertIn("medecins_avec_patients", r.data)
        # Les deux clés sont identiques par conception
        self.assertEqual(r.data["patients_par_medecin"], r.data["medecins_avec_patients"])

    def test_associations_view_unauthenticated_returns_401(self):
        """
        Sans token → 401.
        """
        self.client.credentials()
        r = self.client.get("/api/doctors/medecins-patients/")
        self.assertEqual(r.status_code, status.HTTP_401_UNAUTHORIZED)


# ===========================================================================
# 6. Service de vérification de licence
# ===========================================================================

class TestDoctorLicenseVerificationService(BaseTestCase):

    @override_settings(LICENCE_VERIFICATION_API=None)
    def test_verify_license_returns_false_when_not_configured(self):
        """
        Scénario 23 : URL API non configurée → False.
        """
        self.assertFalse(DoctorVerificationService.verify_license("123456789"))

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    def test_verify_license_returns_false_without_number(self):
        """
        Numéro de licence vide → False.
        """
        self.assertFalse(DoctorVerificationService.verify_license(""))

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_accepts_valid_fhir_bundle(self, mock_get):
        """
        Scénario 24 : Réponse FHIR valide avec entrées → True.
        """
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {
            "resourceType": "Bundle",
            "total": 1,
            "entry": [{"resource": {"id": "practitioner-abc"}}],
        }
        mock_get.return_value = mock_resp

        result = DoctorVerificationService.verify_license("RPPS999")
        self.assertTrue(result)
        mock_get.assert_called_once_with(
            "https://annuaire.test/Practitioner?identifier=RPPS999", timeout=5
        )

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_returns_false_on_empty_bundle(self, mock_get):
        """
        Bundle FHIR avec total=0 → False.
        """
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {"resourceType": "Bundle", "total": 0, "entry": []}
        mock_get.return_value = mock_resp

        self.assertFalse(DoctorVerificationService.verify_license("RPPS000"))

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_handles_network_error(self, mock_get):
        """
        Scénario 25 : Erreur réseau → False (pas d'exception levée).
        """
        mock_get.side_effect = _requests.RequestException("timeout")
        self.assertFalse(DoctorVerificationService.verify_license("RPPS111"))

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_returns_false_on_server_error(self, mock_get):
        """
        Serveur répond 503 → False.
        """
        mock_get.return_value = MagicMock(status_code=503)
        self.assertFalse(DoctorVerificationService.verify_license("RPPS222"))

    @override_settings(LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_returns_false_on_invalid_json(self, mock_get):
        """
        Réponse non-JSON → False.
        """
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.side_effect = _requests.exceptions.JSONDecodeError("bad json", "", 0)
        mock_get.return_value = mock_resp
        self.assertFalse(DoctorVerificationService.verify_license("RPPS333"))

    @override_settings(
        LICENCE_VERIFICATION_API="https://annuaire.test/Practitioner?active=true"
    )
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_appends_identifier_with_ampersand(self, mock_get):
        """
        URL avec query string existante → identifier ajouté avec '&'.
        """
        mock_resp = MagicMock(status_code=200)
        mock_resp.json.return_value = {
            "resourceType": "Bundle",
            "total": 1,
            "entry": [{"resource": {}}],
        }
        mock_get.return_value = mock_resp

        DoctorVerificationService.verify_license("RPPS444")
        mock_get.assert_called_once_with(
            "https://annuaire.test/Practitioner?active=true&identifier=RPPS444",
            timeout=5,
        )


# ===========================================================================
# 7. Scénario bout-en-bout complet
# ===========================================================================

class TestFullDoctorWorkflow(BaseTestCase):
    """
    Scénario bout-en-bout :
    1. Admin valide le médecin
    2. Médecin se connecte
    3. Patient invite le médecin
    4. Médecin accepte l'invitation
    5. Médecin voit le patient dans son équipe (ACTIVE)
    6. Médecin met à jour l'HbA1c
    7. Médecin consulte le dashboard et la glycémie
    8. Patient retire le médecin de son équipe
    """

    def test_full_doctor_workflow(self):
        admin = self._make_admin("admin_flow@test.com")
        doc = self._make_doctor(
            "doc_flow@test.com", verified=False, license_no="LIC-FLOW", phone="0700000001"
        )
        pat = self._make_patient("pat_flow@test.com", phone="0600000200")

        dp = doc.user.profiles.filter(role__name="DOCTOR").first().doctor_profile
        patient_user_id = str(pat.user.id_user)

        # 1. Admin valide le médecin
        self._auth(self._token("admin_flow@test.com", "adminPass123!"))
        r = self.client.post(f"/api/doctors/verification/{dp.doctor_id}/accept/")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        dp.refresh_from_db()
        self.assertEqual(dp.verification_status.label, "VERIFIED")

        # 2. Médecin se connecte
        doc_token = self._token("doc_flow@test.com", "doctorPass123!")
        self.assertIsNotNone(doc_token)

        # 3. Patient invite le médecin
        pat_token = self._token("pat_flow@test.com", "patientPass123!")
        self._auth(pat_token)
        r = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc_flow@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        invitation_id = r.data["id_team_member"]

        # 4. Médecin accepte l'invitation
        self._auth(doc_token)
        r = self.client.post(
            "/api/doctors/care-team/accept-invitation/",
            {"id_team_member": invitation_id},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)

        # 5. Médecin voit le patient dans son équipe (ACTIVE)
        r = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(len(r.data["active_patients"]), 1)

        # 6. Médecin met à jour l'HbA1c
        r = self.client.patch(
            f"/api/doctors/patients/{patient_user_id}/medical/",
            {"hba1c": "6.8"},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        # 7. Médecin consulte le dashboard et la glycémie
        r = self.client.get(
            "/api/doctors/care-team/patient-dashboard/",
            {"patient_user_id": patient_user_id},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        r = self.client.get(
            "/api/doctors/care-team/patient-glycemia/",
            {"patient_user_id": patient_user_id},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

        # 8. Patient retire le médecin de son équipe
        self._auth(pat_token)
        r = self.client.post(
            "/api/doctors/care-team/remove-member/",
            {"id_team_member": invitation_id},
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertFalse(
            PatientCareTeam.objects.filter(id_team_member=invitation_id).exists()
        )
