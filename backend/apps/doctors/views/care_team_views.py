from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction

from apps.users.models import User, AuthAccount
from apps.profiles.models import Profile, Role
from apps.doctors.models import PatientCareTeam, InvitationStatus
from apps.doctors.utils import send_care_team_invitation
from apps.doctors.serializers import PatientCareTeamSerializer


class CareTeamViewSet(viewsets.ViewSet):
    """
    ViewSet for managing the Care Team (Patients <-> Doctors/Family).
    Standardizes disparate APIViews into actions.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='add-family')
    def add_family_member(self, request):
        """
        Add a family member/caregiver manually.
        Endpoint: POST /api/doctors/care-team/add-family/
        """
        data = request.data
        
        # Security Check: Ensure requester is a PATIENT
        patient_role_profile = request.user.user.profiles.filter(role__name="PATIENT").first()
        
        if not patient_role_profile:
             return Response({"error": "Only patients can add care team members."}, status=403)
             
        if not hasattr(patient_role_profile, 'patient_profile'):
             return Response({"error": "Patient profile incomplete."}, status=400)
             
        patient_profile = patient_role_profile.patient_profile
        
        # 1. Create Identity (User)
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        phone_number = data.get("phone_number")
        address = data.get("address")
        relation = data.get("relation_type", "Family")
        role_name = data.get("role", "FAMILY") # FAMILY or CAREGIVER
        
        if not first_name or not last_name:
            return Response({"error": "First name and last name are required"}, status=400)

        with transaction.atomic():
            user_identity = User.objects.create(
                first_name=first_name,
                last_name=last_name,
                phone_number=phone_number,
                address=address
            )
            
            # 2. Create Profile (Role)
            role_obj = Role.objects.get(name=role_name)
            member_profile = Profile.objects.create(user=user_identity, role=role_obj)
            
            # 3. Create Care Team Entry (Active immediately)
            active_status = InvitationStatus.objects.get(label="ACTIVE")
            
            team_member = PatientCareTeam.objects.create(
                patient_profile=patient_profile,
                member_profile=member_profile,
                role=role_name,
                relation_type=relation,
                status=active_status
            )
            
        return Response({"message": "Family member added", "id": team_member.id_team_member}, status=201)

    @action(detail=False, methods=['post'], url_path='invite-doctor')
    def invite_doctor(self, request):
        """
        Invite a doctor/specialist by email.
        Endpoint: POST /api/doctors/care-team/invite-doctor/
        """
        email = request.data.get("email")
        role = request.data.get("role") # REFERENT_DOCTOR or SPECIALIST
        
        if not email or not role:
            return Response({"error": "Email and role are required"}, status=400)
            
        # Security Check: Ensure requester is a PATIENT
        patient_role_profile = request.user.user.profiles.filter(role__name="PATIENT").first()
        
        if not patient_role_profile:
             return Response({"error": "Only patients can invite doctors."}, status=403)

        if not hasattr(patient_role_profile, 'patient_profile'):
             return Response({"error": "Patient profile incomplete."}, status=400)
             
        patient_profile = patient_role_profile.patient_profile
        inviter_name = f"{request.user.user.first_name} {request.user.user.last_name}"
        
        pending_status = InvitationStatus.objects.get(label="PENDING")
        
        # Check if auth account exists
        try:
            auth_account = AuthAccount.objects.get(email=email)
            member_profile = auth_account.user.profiles.first()
            
            PatientCareTeam.objects.create(
                patient_profile=patient_profile,
                member_profile=member_profile,
                role=role,
                status=pending_status
            )
            created_method = "Linked to existing user"
            # Send Email (Existing)
            send_care_team_invitation(email, inviter_name, role, is_existing_user=True)
            
        except AuthAccount.DoesNotExist:
            # User does not exist - Create Pending Invitation by Email
            PatientCareTeam.objects.create(
                patient_profile=patient_profile,
                member_profile=None, # No profile yet
                invitation_email=email,
                role=role,
                status=pending_status
            )
            created_method = "Invitation created for new user"
            # Send Email (New User)
            send_care_team_invitation(email, inviter_name, role, is_existing_user=False)

        return Response({"message": "Invitation sent/created", "method": created_method}, status=201)

    @action(detail=False, methods=['post'], url_path='add-patient')
    def add_patient(self, request):
        """
        Doctor adds an EXISTING patient by Email or Phone.
        Endpoint: POST /api/doctors/care-team/add-patient/
        """
        # Ensure requester is a Doctor
        try:
            doctor_profile = request.user.user.profiles.filter(role__name="DOCTOR").first()
        except:
            doctor_profile = None
            
        if not doctor_profile:
             return Response({"error": "Only doctors can perform this action"}, status=403)

        # Check if doctor is VERIFIED
        if not hasattr(doctor_profile, 'doctor_profile') or \
           doctor_profile.doctor_profile.verification_status.label != "VERIFIED":
             return Response({"error": "You must be a VERIFIED doctor to add patients."}, status=403)

        email = request.data.get("email")
        phone = request.data.get("phone_number")
        
        if not email and not phone:
            return Response({"error": "Email or Phone Number is required"}, status=400)
            
        target_user = None
        
        # Search by Email
        if email:
            try:
                account = AuthAccount.objects.get(email=email)
                target_user = account.user
            except AuthAccount.DoesNotExist:
                pass
        
        # Search by Phone (if not found by email)
        if not target_user and phone:
            target_user = User.objects.filter(phone_number=phone).first()
            
        if not target_user:
            if email:
                inviter_name = f"Dr. {request.user.user.last_name}"
                send_care_team_invitation(email, inviter_name, "PATIENT", is_existing_user=False)
                return Response({"message": "Patient not found, invitation email sent"}, status=200)
            return Response({"error": "Patient not found in database"}, status=404)
            
        # Get Patient Profile
        target_patient_profile = None
        # Check profiles
        patient_role_profile = target_user.profiles.filter(role__name="PATIENT").first()
        if patient_role_profile and hasattr(patient_role_profile, 'patient_profile'):
            target_patient_profile = patient_role_profile.patient_profile
            
        if not target_patient_profile:
             return Response({"error": "User found but is not a registered patient"}, status=404)
             
        # Create Link (Pending)
        pending_status = InvitationStatus.objects.get(label="PENDING")
        
        # Check existence
        if PatientCareTeam.objects.filter(
            patient_profile=target_patient_profile,
            member_profile=doctor_profile
        ).exists():
             return Response({"error": "Relation already exists"}, status=400)
             
        PatientCareTeam.objects.create(
            patient_profile=target_patient_profile,
            member_profile=doctor_profile,
            role="REFERENT_DOCTOR", 
            status=pending_status,
            approved_by=doctor_profile.doctor_profile
        )
        
        # Send Email to Patient
        if hasattr(target_user, 'auth_account'):
            patient_email = target_user.auth_account.email
            inviter_name = f"Dr. {request.user.user.last_name}"
            send_care_team_invitation(patient_email, inviter_name, "PATIENT", is_existing_user=True)
        
        return Response({"message": "Invitation sent to patient"}, status=201)

    @action(detail=False, methods=['get'], url_path='my-team')
    def my_team(self, request):
        """
        Get the authenticated user's care team.
        Endpoint: GET /api/doctors/care-team/my-team/
        """
        user = request.user.user
        
        # Check if Patient
        patient_role = user.profiles.filter(role__name="PATIENT").first()
        if patient_role and hasattr(patient_role, 'patient_profile'):
            return self._get_patient_team(patient_role.patient_profile)
            
        # Check if Doctor
        doctor_role = user.profiles.filter(role__name="DOCTOR").first()
        if doctor_role and hasattr(doctor_role, 'doctor_profile'):
            return self._get_doctor_patients(doctor_role) # Use generic profile for link
            
        return Response({"error": "Profile not found"}, status=404)

    def _get_patient_team(self, patient_profile):
        team = PatientCareTeam.objects.filter(patient_profile=patient_profile)
        
        # Categories
        doctors = team.filter(role__in=["REFERENT_DOCTOR", "SPECIALIST"], status__label="ACTIVE")
        family = team.filter(role__in=["FAMILY", "CAREGIVER", "NURSE"], status__label="ACTIVE")
        pending = team.filter(status__label="PENDING")
        
        data = {
            "doctors": PatientCareTeamSerializer(doctors, many=True).data,
            "family": PatientCareTeamSerializer(family, many=True).data,
            "pending": PatientCareTeamSerializer(pending, many=True).data
        }
        return Response(data)

    def _get_doctor_patients(self, doctor_profile):
        # Doctor is the 'member' in the relation
        relations = PatientCareTeam.objects.filter(member_profile=doctor_profile)
        
        active = relations.filter(status__label="ACTIVE")
        pending = relations.filter(status__label="PENDING")
        
        data = {
            "active_patients": PatientCareTeamSerializer(active, many=True).data,
            "pending_invites": PatientCareTeamSerializer(pending, many=True).data
        }
        return Response(data)
