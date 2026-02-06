from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)

from apps.users.models import User, AuthAccount
from apps.profiles.models import Profile, Role
from apps.doctors.models import PatientCareTeam, InvitationStatus
from apps.doctors.utils import send_care_team_invitation
from apps.doctors.serializers import PatientCareTeamSerializer
from apps.doctors.services import DoctorPatientDataService

def _get_identity(user_obj):
    """Return the User identity for AuthAccount or User."""
    return getattr(user_obj, "user", None) or user_obj

def _get_invitation_status(label):
    """Récupère ou crée le statut d'invitation (PENDING/ACTIVE) pour garantir l'intégrité."""
    obj, _ = InvitationStatus.objects.get_or_create(label=label, defaults={"label": label})
    return obj


class CareTeamViewSet(viewsets.ViewSet):
    """
    Gère l'équipe de soin (Patients <-> Médecins/Famille).
    Standardise les vues API en actions.
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='add-family')
    def add_family_member(self, request):
        """
        Ajoute un membre de la famille ou un aidant manuellement.
        """
        data = request.data
        
        # Security Check: Ensure requester is a PATIENT
        identity = _get_identity(request.user)
        patient_role_profile = identity.profiles.filter(role__name__iexact="PATIENT").first() if identity else None
        
        if not patient_role_profile:
             return Response({"error": "Only patients can add care team members."}, status=403)
             
        if not hasattr(patient_role_profile, 'patient_profile'):
             return Response({"error": "Patient profile incomplete."}, status=400)
             
        patient_profile = patient_role_profile.patient_profile
        

        first_name = data.get("first_name")
        last_name = data.get("last_name")
        phone_number = data.get("phone_number")
        address = data.get("address")
        relation = data.get("relation_type", "Family")
        role_name = (data.get("role") or "FAMILY").strip().upper()
        allowed_family_roles = {"FAMILY", "CAREGIVER", "NURSE"}
        if role_name not in allowed_family_roles:
            return Response(
                {"error": "Rôle invalide. Valeurs acceptées : FAMILY, CAREGIVER, NURSE."},
                status=400,
            )

        if not first_name or not last_name:
            return Response({"error": "Prénom et nom sont requis."}, status=400)

        role_obj, _ = Role.objects.get_or_create(name=role_name, defaults={"name": role_name})
        active_status = _get_invitation_status("ACTIVE")

        with transaction.atomic():
            user_identity = User.objects.create(
                first_name=first_name,
                last_name=last_name,
                phone_number=phone_number or "",
                address=address or "",
            )
            member_profile = Profile.objects.create(user=user_identity, role=role_obj)
            
            team_member = PatientCareTeam.objects.create(
                patient_profile=patient_profile,
                member_profile=member_profile,
                role=role_name,
                relation_type=relation or "",
                status=active_status,
            )

        return Response(
            {"message": "Membre ajouté à l'équipe.", "id": str(team_member.id_team_member)},
            status=201,
        )

    @action(detail=False, methods=['post'], url_path='invite-doctor')
    def invite_doctor(self, request):
        """
        Le patient invite un médecin (référent ou spécialiste) par email.
        L'email est envoyé au DOCTEUR invité.
        """
        email = (request.data.get("email") or "").strip().lower()
        role = (request.data.get("role") or "").strip()

        if not email:
            return Response({"error": "Email requis."}, status=400)
        if role not in (PatientCareTeam.TeamRole.REFERENT_DOCTOR, PatientCareTeam.TeamRole.SPECIALIST):
            return Response(
                {"error": "Rôle invalide. Valeurs acceptées : REFERENT_DOCTOR, SPECIALIST."},
                status=400,
            )

        # Le patient ne peut pas s'inviter lui-même
        if email == request.user.email:
            return Response(
                {"error": "Désolé, le rôle référent que vous cherchez à inviter n'existe pas. Contactez votre docteur."},
                status=400,
            )

        identity = _get_identity(request.user)
        patient_role_profile = identity.profiles.filter(role__name__iexact="PATIENT").first() if identity else None
        if not patient_role_profile:
            return Response({"error": "Seuls les patients peuvent inviter un médecin."}, status=403)
        if not hasattr(patient_role_profile, "patient_profile"):
            return Response({"error": "Profil patient incomplet."}, status=400)

        patient_profile = patient_role_profile.patient_profile
        inviter_name = f"{request.user.user.first_name} {request.user.user.last_name}"
        pending_status = _get_invitation_status("PENDING")

        # Vérifier que l'email correspond à un DOCTEUR existant en base
        try:
            auth_account = AuthAccount.objects.get(email=email)
        except AuthAccount.DoesNotExist:
            return Response(
                {"error": "Désolé, le rôle référent que vous cherchez à inviter n'existe pas. Contactez votre docteur."},
                status=400,
            )

        member_profile = auth_account.user.profiles.filter(role__name__iexact="DOCTOR").first()
        if not member_profile or not getattr(member_profile, "doctor_profile", None):
            return Response(
                {"error": "Désolé, le rôle référent que vous cherchez à inviter n'existe pas. Contactez votre docteur."},
                status=400,
            )
        # Docteur non validé = compte indisponible / inexistant pour le patient
        if member_profile.doctor_profile.verification_status.label != "VERIFIED":
            return Response(
                {"error": "Désolé, le rôle référent que vous cherchez à inviter n'existe pas ou n'est pas encore disponible. Contactez votre docteur."},
                status=400,
            )

        # Éviter doublon
        if PatientCareTeam.objects.filter(
            patient_profile=patient_profile,
            member_profile=member_profile,
        ).exists():
            return Response({"error": "Ce médecin fait déjà partie de votre équipe ou a déjà une invitation en attente."}, status=400)

        invitation = PatientCareTeam.objects.create(
            patient_profile=patient_profile,
            member_profile=member_profile,
            role=role,
            status=pending_status,
        )
        # Email envoyé au DOCTEUR (destinataire = email du médecin)
        send_care_team_invitation(email, inviter_name, role, is_existing_user=True)

        return Response(
            {"message": "Invitation envoyée au médecin.", "id_team_member": str(invitation.id_team_member)},
            status=201,
        )

    @action(detail=False, methods=['post'], url_path='add-patient')
    def add_patient(self, request):
        """
        Le médecin ajoute un patient existant par email ou téléphone.
        """
        # request.user est AuthAccount; identity est User (propriétaire du profil)
        identity = _get_identity(request.user)
        if not identity or not hasattr(identity, "profiles"):
            return Response(
                {"error": "Only doctors can perform this action. Use a doctor account token (e.g. Login as Doctor, then use that token)."},
                status=403,
            )
        doctor_profile = identity.profiles.filter(role__name__iexact="DOCTOR").first()
        if not doctor_profile:
            return Response(
                {"error": "Only doctors can perform this action. This account has no doctor profile—log in with a verified doctor account."},
                status=403,
            )

        # Check if doctor is VERIFIED
        if not hasattr(doctor_profile, 'doctor_profile') or \
           doctor_profile.doctor_profile.verification_status.label != "VERIFIED":
             return Response({"error": "You must be a VERIFIED doctor to add patients."}, status=403)

        email = (request.data.get("email") or "").strip().lower()
        phone = (request.data.get("phone_number") or "").strip()

        if not email and not phone:
            return Response({"error": "Email ou numéro de téléphone requis."}, status=400)

        # Le médecin ne peut pas s'ajouter lui-même comme patient
        if email == request.user.email:
            return Response({"error": "Vous ne pouvez pas vous ajouter vous-même comme patient."}, status=400)

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
             
        pending_status = _get_invitation_status("PENDING")
        
        # Check existence
        if PatientCareTeam.objects.filter(
            patient_profile=target_patient_profile,
            member_profile=doctor_profile
        ).exists():
             return Response({"error": "Relation already exists"}, status=400)
             
        invitation = PatientCareTeam.objects.create(
            patient_profile=target_patient_profile,
            member_profile=doctor_profile,
            role="REFERENT_DOCTOR", 
            status=pending_status,
            approved_by=doctor_profile.doctor_profile
        )
        
        # Email envoyé au PATIENT invité (jamais au médecin) — récupération sécurisée
        inviter_name = f"Dr. {request.user.user.last_name}"
        patient_email = email or (AuthAccount.objects.filter(user=target_user).values_list("email", flat=True).first() or "")
        if patient_email:
            try:
                send_care_team_invitation(patient_email, inviter_name, "PATIENT", is_existing_user=True)
            except Exception as e:
                logger.error(f"Erreur lors de l'envoi de l'invitation patient: {e}") 
                # L'invitation est créée même si l'email échoue

        return Response(
            {"message": "Invitation envoyée au patient.", "id_team_member": str(invitation.id_team_member)},
            status=201,
        )

    @action(detail=False, methods=['post'], url_path='accept-invitation')
    def accept_invitation(self, request):
        """
        Accepter une invitation (médecin ou patient). Passe le statut à ACTIVE.
        """
        id_team_member = request.data.get("id_team_member") or request.query_params.get("id_team_member")
        if not id_team_member:
            return Response({"error": "id_team_member requis."}, status=400)

        try:
            entry = PatientCareTeam.objects.get(id_team_member=id_team_member, status__label="PENDING")
        except PatientCareTeam.DoesNotExist:
            return Response({"error": "Invitation introuvable ou déjà traitée."}, status=404)

        current_user_id = getattr(request.user, "user_id", None) or (request.user.user.pk if getattr(request.user, "user", None) else None)
        if not current_user_id:
            return Response({"error": "Utilisateur non identifié."}, status=403)
        # Vérifier que l'utilisateur connecté est le médecin invité ou le patient invité (sans requête AuthAccount)
        is_doctor_invited = bool(entry.member_profile and entry.member_profile.user_id == current_user_id)
        patient_profile_obj = getattr(entry, "patient_profile", None)
        patient_identity_id = None
        if patient_profile_obj and getattr(patient_profile_obj, "profile", None):
            patient_identity_id = getattr(patient_profile_obj.profile, "user_id", None) or (patient_profile_obj.profile.user.pk if patient_profile_obj.profile.user else None)
        is_patient_invited = patient_identity_id is not None and patient_identity_id == current_user_id

        if not is_doctor_invited and not is_patient_invited:
            return Response({"error": "Vous ne pouvez pas accepter cette invitation."}, status=403)

        active_status = _get_invitation_status("ACTIVE")
        with transaction.atomic():
            entry.status = active_status
            entry.save(update_fields=["status", "updated_at"])

        return Response({"message": "Invitation acceptée.", "status": "ACTIVE"}, status=200)

    @action(detail=False, methods=['get'], url_path='my-team')
    def my_team(self, request):
        """
        Récupère l'équipe de soin de l'utilisateur connecté.
        """
        user = _get_identity(request.user)
        
        # Check if Patient
        patient_role = user.profiles.filter(role__name__iexact="PATIENT").first() if user else None
        if patient_role and hasattr(patient_role, 'patient_profile'):
            return self._get_patient_team(patient_role.patient_profile)
            
        # Check if Doctor
        doctor_role = user.profiles.filter(role__name__iexact="DOCTOR").first() if user else None
        if doctor_role and hasattr(doctor_role, 'doctor_profile'):
            return self._get_doctor_patients(doctor_role)
            
        return Response({"error": "Profile not found"}, status=404)

    def _get_patient_team(self, patient_profile):
        team = PatientCareTeam.objects.filter(patient_profile=patient_profile)
        
        # Categories
        doctors = team.filter(role__in=["REFERENT_DOCTOR", "SPECIALIST"], status__label="ACTIVE")
        family = team.filter(role__in=["FAMILY", "CAREGIVER", "NURSE"], status__label="ACTIVE")
        data = {
            "doctors": PatientCareTeamSerializer(doctors, many=True).data,
            "family": PatientCareTeamSerializer(family, many=True).data
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

    @action(detail=False, methods=['get'], url_path='patient-dashboard')
    def get_patient_dashboard(self, request):
        """
        Résumé du tableau de bord d'un patient.
        Accessible uniquement aux médecins avec une relation ACTIVE.
        """
        patient_user_id = request.query_params.get("patient_user_id")
        user, error_response = self._verify_doctor_access(request, patient_user_id)
        if error_response: return error_response
        
        data = DoctorPatientDataService.get_patient_dashboard(user)
        return Response(data)

    def _verify_doctor_access(self, request, patient_user_id):
        if not patient_user_id:
             patient_user_id = request.query_params.get("patient_id") or request.data.get("patient_user_id") or request.data.get("patient_id")
        if not patient_user_id:
             return None, Response({"error": "patient_user_id is required"}, status=400)

        doctor_user = _get_identity(request.user)
        doctor_role = doctor_user.profiles.filter(role__name__iexact="DOCTOR").first() if doctor_user else None
        
        if not doctor_role:
             return None, Response({"error": "Access denied. Doctors only."}, status=403)

        if not hasattr(doctor_role, 'doctor_profile'):
             return None, Response({"error": "Access denied. Doctors only."}, status=403)
             
        try:
            can_access = PatientCareTeam.objects.filter(
                member_profile=doctor_role,
                patient_profile__profile__user__id_user=patient_user_id,
                status__label="ACTIVE",
                role__in=["REFERENT_DOCTOR", "SPECIALIST"]
            ).exists()
        except ValidationError:
            # Handles invalid UUID format in patient_user_id
            return None, Response({"error": "Invalid patient_user_id format (UUID required)."}, status=400)
        
        if not can_access:
            return None, Response(
                {"error": "Access denied. You are not an active doctor for this patient."},
                status=403
            )
            
        try:
            patient_user = AuthAccount.objects.get(user__pk=patient_user_id)
            return patient_user, None
        except (AuthAccount.DoesNotExist, ValidationError):
             return None, Response({"error": "Patient user or account_auth not found"}, status=404)

    @action(detail=False, methods=['get'], url_path='patient-meals')
    def get_patient_meals(self, request):
        patient_id = request.query_params.get("patient_user_id")
        user, error_response = self._verify_doctor_access(request, patient_id)
        if error_response: return error_response
        
        from apps.doctors.services import DoctorPatientDataService
        data = DoctorPatientDataService.get_meals_history(user)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='patient-medications')
    def get_patient_medications(self, request):
        patient_id = request.query_params.get("patient_user_id")
        user, error_response = self._verify_doctor_access(request, patient_id)
        if error_response: return error_response
        
        from apps.doctors.services import DoctorPatientDataService
        data = DoctorPatientDataService.get_medications_history(user)
        return Response(data)

    @action(detail=False, methods=['get'], url_path='patient-glycemia')
    def get_patient_glycemia(self, request):
        patient_id = request.query_params.get("patient_user_id")
        user, error_response = self._verify_doctor_access(request, patient_id)
        if error_response: return error_response
        
        from apps.doctors.services import DoctorPatientDataService
        data = DoctorPatientDataService.get_glycemia_history(user)
        return Response(data)

