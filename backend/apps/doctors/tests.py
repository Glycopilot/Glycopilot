from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.doctors.models import DoctorProfile, PatientCareTeam, InvitationStatus, VerificationStatus
from apps.profiles.models import Profile, Role
from apps.users.models import User as UserIdentity

User = get_user_model()

class CareTeamIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # 1. Setup Data (Roles, Statuses)
        self.patient_role, _ = Role.objects.get_or_create(name="PATIENT")
        self.doctor_role, _ = Role.objects.get_or_create(name="DOCTOR")
        self.family_role, _ = Role.objects.get_or_create(name="FAMILY")
        
        InvitationStatus.objects.get_or_create(label="ACTIVE")
        InvitationStatus.objects.get_or_create(label="PENDING")
        self.verified_status, _ = VerificationStatus.objects.get_or_create(label="VERIFIED")

    def test_full_care_team_scenario(self):
        # ==================================================================================
        # 1. Create Patient Account
        # ==================================================================================
        patient_email = "patient@test.com"
        patient_password = "password123"
        
        # Register via API (or create manually if register is complex to mock fully, but creating manually is safer for this 'logic' test)
        # Using manual creation to focus on the 'connect' and 'link' logic as requested, ensuring base state is correct.
        patient_identity = UserIdentity.objects.create(first_name="Patient", last_name="Moi", phone_number="0600000001", address="1 Rue Patient")
        patient_user = User.objects.create_user(email=patient_email, password=patient_password, user_identity=patient_identity)
        Profile.objects.create(user=patient_identity, role=self.patient_role, label="Patient Profile")

        # ==================================================================================
        # 2. Connect as Patient
        # ==================================================================================
        response = self.client.post("/api/auth/login/", {"email": patient_email, "password": patient_password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        patient_token = response.data["access"]
        
        # Verify Patient Identity (Get Me)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {patient_token}")
        response = self.client.get("/api/auth/me/") # Changed to correct ME endpoint based on AUTH_API.md
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], patient_email)
        
        # ==================================================================================
        # 3. Create Doctor Account
        # ==================================================================================
        doctor_email = "doctor@test.com"
        doctor_password = "password123"
        
        doctor_identity = UserIdentity.objects.create(first_name="Doctor", last_name="Strange", phone_number="0600000002", address="1 Rue Doctor")
        doctor_user = User.objects.create_user(email=doctor_email, password=doctor_password, user_identity=doctor_identity)
        doctor_profile_obj = Profile.objects.create(user=doctor_identity, role=self.doctor_role, label="Doctor Profile")
        
        # Update doctor as VERIFIED (profile auto-created by signal)
        doctor_profile = doctor_profile_obj.doctor_profile
        doctor_profile.verification_status = self.verified_status
        doctor_profile.license_number = "DOC123"
        doctor_profile.medical_center_name = "Hospital"
        doctor_profile.medical_center_address = "City"
        doctor_profile.save()

        # ==================================================================================
        # 4. Connect as Doctor
        # ==================================================================================
        # Clear credentials first to simulate clean client or separate login
        self.client.credentials() 
        
        response = self.client.post("/api/auth/login/", {"email": doctor_email, "password": doctor_password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        doctor_token = response.data["access"]
        
        # Verify Doctor Identity (Get Me)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {doctor_token}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], doctor_email)

        # ==================================================================================
        # 5. Verify Isolation (Cross-Access Check)
        # ==================================================================================
        # Verify Owner of Token 1 is NOT Token 2's User
        # Using Patient Token, call Me -> Should get Patient
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {patient_token}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.data["email"], patient_email)
        self.assertNotEqual(response.data["email"], doctor_email)
        
        # Using Doctor Token, call Me -> Should get Doctor
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {doctor_token}")
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.data["email"], doctor_email)
        self.assertNotEqual(response.data["email"], patient_email)

        # ==================================================================================
        # 6. Patient Invites Doctor (api/doctors/care-team/invite-doctor/)
        # ==================================================================================
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {patient_token}")
        
        # Try to invite doctor
        invite_data = {
            "email": doctor_email,
            "role": "REFERENT_DOCTOR"
        }
        response = self.client.post("/api/doctors/care-team/invite-doctor/", invite_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["method"], "Linked to existing user")

        # ==================================================================================
        # 7. Patient Adds Family Member (api/doctors/care-team/add-family/)
        # ==================================================================================
        family_data = {
            "first_name": "Mom",
            "last_name": "Moi",
            "phone_number": "0699999999",
            "role": "FAMILY",
            "relation_type": "Mother",
            "address": "Same Address"
        }
        response = self.client.post("/api/doctors/care-team/add-family/", family_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # ==================================================================================
        # 8. Doctor Adds Patient (api/doctors/care-team/add-patient/)
        # ==================================================================================
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {doctor_token}")
        
        # Note: In our current logic, duplicate links might be blocked or handled. 
        # The patient ALREADY invited the doctor in step 6. The Relation might act as a 2-way link.
        # Let's check if the previous invite created the link for the doctor too.
        # But per the prompt: "et un docter ajoute un patien". 
        # If the relation already exists, our AddPatientView returns 400 "Relation already exists".
        # So we should create a SECOND patient to test the Doctor->Patient add explicitly, 
        # OR expect a 400 if we try to add the SAME patient again.
        # However, the previous Invite was "Invited by Patient". Status might be PENDING.
        # AddPatientView from Doctor creates "Invited by Doctor" (PENDING) or confirms?
        # The AddPatientView checks: if PatientCareTeam.objects.filter(...).exists(): error.
        
        # So to test "Doctor Adds Patient" successfully, let's use a NEW Patient logic or handle the 400.
        # But the prompt implies a single flow. Maybe the Patient Invite was for specific Doctor 1, and Doctor 2 adds Patient? 
        # Or maybe the prompt implies sequential actions that should work.
        # Let's check status of the link created by Patient.
        # It's InvitationStatus=PENDING.
        # AddPatientView checks existence strictly: `if PatientCareTeam.objects.filter(...).exists(): return Error`.
        # So adding the SAME patient will fail.
        
        # To satisfy "Doctor adds a patient", I will create a Second Patient who hasn't invited the doctor yet.
        
        patient2_email = "patient2@test.com"
        patient2_identity = UserIdentity.objects.create(first_name="Patient2", last_name="Two", phone_number="0600000022")
        patient2_user = User.objects.create_user(email=patient2_email, password="password", user_identity=patient2_identity)
        Profile.objects.create(user=patient2_identity, role=self.patient_role)
        
        add_patient_data = {
            "email": patient2_email
        }
        response = self.client.post("/api/doctors/care-team/add-patient/", add_patient_data)
        
        # Expect 201 Created
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "Invitation sent to patient")

        # ==================================================================================
        # 9. Doctor Retrieves Information (My Team)
        # ==================================================================================
        response = self.client.get("/api/doctors/care-team/my-team/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        # Doctor should see:
        # 1. First Patient (who invited him) - likely in 'pending_invites' or 'active_patients' depending on flow?
        #    Actually, the Patient Invite created a PENDING relation.
        # 2. Second Patient (who the doctor invited) - also PENDING.
        
        # Let's verify we see entries (keys are active_patients, pending_invites).
        self.assertIn("active_patients", data)
        self.assertIn("pending_invites", data)
        
        # We expect 2 pending invites (one incoming from P1, one outgoing to P2)
        # Assuming the view returns all pending relations involving this doctor.
        # View logic: `relations = PatientCareTeam.objects.filter(member_profile=doctor_profile)`
        # `pending = relations.filter(status__label="PENDING")`
        # Yes, both should be there.
        
        self.assertEqual(len(data["pending_invites"]), 2)
        
        # Verify specific emails/names if possible from serializer data, but count is good enough proof for this level.
