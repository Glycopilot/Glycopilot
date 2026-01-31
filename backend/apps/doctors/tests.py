"""
Tests : création compte patient, invitations, admin valide le docteur,
docteur non validé = indisponible pour le patient, docteur validé peut ajouter un patient.
"""
from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APIClient

from apps.doctors.models import InvitationStatus, PatientCareTeam, VerificationStatus
from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()


class CareTeamIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.patient_role, _ = Role.objects.get_or_create(name="PATIENT")
        self.doctor_role, _ = Role.objects.get_or_create(name="DOCTOR")
        Role.objects.get_or_create(name="FAMILY")
        Role.objects.get_or_create(name="SUPERADMIN")
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")
        self.verified_status, _ = VerificationStatus.objects.get_or_create(
            label="VERIFIED"
        )
        self.pending_status, _ = VerificationStatus.objects.get_or_create(
            label="PENDING"
        )

    def test_patient_register_creates_account(self):
        """Création d'un compte patient via l'API register."""
        data = {
            "email": "patient_care@test.com",
            "password": "Password123!",
            "password_confirm": "Password123!",
            "first_name": "Jean",
            "last_name": "Patient",
            "role": "PATIENT",
        }
        response = self.client.post("/api/auth/register/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertTrue(User.objects.filter(email="patient_care@test.com").exists())

    def test_patient_invite_unverified_doctor_returns_not_available(self):
        """Le patient ne peut pas inviter un docteur non validé : compte indisponible / inexistant."""
        # Créer patient (manuellement pour avoir PatientProfile via signal)
        patient_identity = UserIdentity.objects.create(
            first_name="Paul", last_name="Patient", phone_number="0600000001"
        )
        User.objects.create_user(
            email="paul@test.com", password="pass123", user_identity=patient_identity
        )
        p_profile = Profile.objects.create(
            user=patient_identity, role=self.patient_role
        )
        self.assertTrue(hasattr(p_profile, "patient_profile"))

        # Créer docteur NON vérifié (PENDING)
        doctor_identity = UserIdentity.objects.create(
            first_name="Doc", last_name="Unverified", phone_number="0600000002"
        )
        User.objects.create_user(
            email="doc_unverified@test.com",
            password="pass123",
            user_identity=doctor_identity,
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_prof = doc_profile.doctor_profile
        doc_prof.verification_status = self.pending_status
        doc_prof.license_number = "LIC-PENDING"
        doc_prof.save()

        # Patient invite le docteur -> doit échouer (docteur non disponible)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('paul@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "doc_unverified@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertIn("n'existe pas", response.data["error"])
        self.assertFalse(
            PatientCareTeam.objects.filter(
                patient_profile=p_profile.patient_profile, member_profile=doc_profile
            ).exists()
        )

    def test_admin_validates_doctor_then_patient_can_invite(self):
        """Admin valide le compte docteur, puis le patient peut inviter le docteur."""
        # Patient
        patient_identity = UserIdentity.objects.create(
            first_name="Alice", last_name="Patient", phone_number="0611111111"
        )
        User.objects.create_user(
            email="alice@test.com", password="pass123", user_identity=patient_identity
        )
        Profile.objects.create(
            user=patient_identity, role=self.patient_role
        )

        # Docteur PENDING
        doctor_identity = UserIdentity.objects.create(
            first_name="Bob", last_name="Doctor", phone_number="0622222222"
        )
        User.objects.create_user(
            email="bob_doctor@test.com",
            password="pass123",
            user_identity=doctor_identity,
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_prof = doc_profile.doctor_profile
        doc_prof.verification_status = self.pending_status
        doc_prof.license_number = "LIC-002"
        doc_prof.save()

        # Admin (superadmin)
        admin_identity = UserIdentity.objects.create(
            first_name="Admin", last_name="Super"
        )
        admin_account = User.objects.create_user(
            email="admin@test.com", password="admin123", user_identity=admin_identity
        )
        admin_account.is_staff = True
        admin_account.is_superuser = True
        admin_account.save()
        admin_role = Role.objects.get(name="SUPERADMIN")
        Profile.objects.create(user=admin_identity, role=admin_role)

        # Admin valide le docteur
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('admin@test.com', 'admin123')}"
        )
        response = self.client.post(
            f"/api/doctors/verification/{doc_prof.doctor_id}/accept/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        doc_prof.refresh_from_db()
        self.assertEqual(doc_prof.verification_status.label, "VERIFIED")

        # Patient invite le docteur -> succès
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('alice@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "bob_doctor@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)

    def test_unverified_doctor_cannot_add_patient(self):
        """Un docteur non validé ne peut pas ajouter de patient."""
        doctor_identity = UserIdentity.objects.create(
            first_name="Unv", last_name="Doc", phone_number="0633333333"
        )
        User.objects.create_user(
            email="unv_doc@test.com", password="pass123", user_identity=doctor_identity
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_profile.doctor_profile.verification_status = self.pending_status
        doc_profile.doctor_profile.license_number = "LIC-UNV"
        doc_profile.doctor_profile.save()

        patient_identity = UserIdentity.objects.create(
            first_name="Pat", last_name="Two", phone_number="0644444444"
        )
        User.objects.create_user(
            email="pat_two@test.com", password="pass123", user_identity=patient_identity
        )
        Profile.objects.create(user=patient_identity, role=self.patient_role)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('unv_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "pat_two@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("VERIFIED", response.data.get("error", ""))

    def test_verified_doctor_can_add_patient(self):
        """Après validation par l'admin, le docteur peut ajouter un patient."""
        doctor_identity = UserIdentity.objects.create(
            first_name="Verified", last_name="Doc", phone_number="0655555555"
        )
        User.objects.create_user(
            email="verified_doc@test.com",
            password="pass123",
            user_identity=doctor_identity,
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_profile.doctor_profile.verification_status = self.verified_status
        doc_profile.doctor_profile.license_number = "LIC-VERIFIED"
        doc_profile.doctor_profile.save()

        patient_identity = UserIdentity.objects.create(
            first_name="NewPat", last_name="Three", phone_number="0666666666"
        )
        User.objects.create_user(
            email="newpat@test.com", password="pass123", user_identity=patient_identity
        )
        Profile.objects.create(user=patient_identity, role=self.patient_role)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('verified_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "newpat@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)

    def test_full_flow_patient_invitations_and_doctor_add_patient(self):
        """Scénario complet : patient créé, invitations (famille), admin valide docteur, patient invite docteur, docteur ajoute un autre patient."""
        # 1. Créer compte patient
        patient_identity = UserIdentity.objects.create(
            first_name="Full", last_name="Patient", phone_number="0677777777"
        )
        User.objects.create_user(
            email="full_patient@test.com",
            password="pass123",
            user_identity=patient_identity,
        )
        p_profile = Profile.objects.create(
            user=patient_identity, role=self.patient_role
        )
        patient_profile = p_profile.patient_profile

        # 2. Patient ajoute un membre famille
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('full_patient@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-family/",
            {
                "first_name": "Marie",
                "last_name": "Famille",
                "role": "FAMILY",
                "relation_type": "Épouse",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 3. Docteur PENDING
        doctor_identity = UserIdentity.objects.create(
            first_name="Full", last_name="Doc", phone_number="0688888888"
        )
        User.objects.create_user(
            email="full_doc@test.com", password="pass123", user_identity=doctor_identity
        )
        doc_profile = Profile.objects.create(
            user=doctor_identity, role=self.doctor_role
        )
        doc_prof = doc_profile.doctor_profile
        doc_prof.verification_status = self.pending_status
        doc_prof.license_number = "LIC-FULL"
        doc_prof.save()

        # 4. Patient ne peut pas encore inviter le docteur
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "full_doc@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 5. Admin valide le docteur
        admin_identity = UserIdentity.objects.create(
            first_name="Super", last_name="Admin"
        )
        admin_account = User.objects.create_user(
            email="super@test.com", password="admin123", user_identity=admin_identity
        )
        admin_account.is_staff = True
        admin_account.is_superuser = True
        admin_account.save()
        Profile.objects.create(
            user=admin_identity, role=Role.objects.get(name="SUPERADMIN")
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('super@test.com', 'admin123')}"
        )
        response = self.client.post(
            f"/api/doctors/verification/{doc_prof.doctor_id}/accept/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 6. Patient invite le docteur
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('full_patient@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/invite-doctor/",
            {"email": "full_doc@test.com", "role": "REFERENT_DOCTOR"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            PatientCareTeam.objects.filter(
                patient_profile=patient_profile, member_profile=doc_profile
            ).exists()
        )

        # 7. Docteur ajoute un autre patient (deuxième patient)
        patient2_identity = UserIdentity.objects.create(
            first_name="Second", last_name="Patient", phone_number="0699999999"
        )
        User.objects.create_user(
            email="second_patient@test.com",
            password="pass123",
            user_identity=patient2_identity,
        )
        Profile.objects.create(user=patient2_identity, role=self.patient_role)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self._token_for('full_doc@test.com', 'pass123')}"
        )
        response = self.client.post(
            "/api/doctors/care-team/add-patient/", {"email": "second_patient@test.com"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 8. Docteur voit son équipe (my-team)
        response = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("active_patients", response.data)
        self.assertIn("pending_invites", response.data)

    def _token_for(self, email, password):
        """Retourne le token d'accès pour email/password."""
        r = self.client.post("/api/auth/login/", {"email": email, "password": password})
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.data)
        return r.data["access"]
