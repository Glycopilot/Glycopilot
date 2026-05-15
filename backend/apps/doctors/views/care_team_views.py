import logging

from django.db import transaction

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

logger = logging.getLogger(__name__)

from apps.doctors.doctor_patient_access import verify_doctor_can_access_patient, verify_proche_can_access_patient
from apps.doctors.models import InvitationStatus, PatientCareTeam
from apps.doctors.serializers import PatientCareTeamSerializer
from apps.doctors.services import DoctorPatientDataService
from apps.doctors.utils import send_care_team_invitation, send_proche_invitation
from apps.notifications.services.push import send_push_to_user
from apps.profiles.models import Profile, Role
from apps.users.models import AuthAccount, User


def _get_identity(user_obj):
    """Return the User identity for AuthAccount or User."""
    return getattr(user_obj, "user", None) or user_obj


def _get_invitation_status(label):
    """Récupère ou crée le statut d'invitation (PENDING/ACTIVE) pour garantir l'intégrité."""
    obj, _ = InvitationStatus.objects.get_or_create(
        label=label, defaults={"label": label}
    )
    return obj


class CareTeamViewSet(viewsets.ViewSet):
    """
    Gère l'équipe de soin (Patients <-> Médecins/Famille).
    Standardise les vues API en actions.
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="add-family")
    def add_family_member(self, request):
        """
        Ajoute un proche (famille / aidant) à l'équipe de soin du patient.

        Corps JSON :
          first_name, last_name      — requis
          email                      — optionnel ; si fourni, un compte invité est créé
          phone_number, address      — optionnels
          relation_type              — ex. "Conjoint", "Parent" (défaut : "Family")
          role                       — FAMILY | CAREGIVER | NURSE (défaut : FAMILY)

        Comportement selon email :
          - Avec email (compte existant) : lien immédiat, statut ACTIVE, email de notification
          - Avec email (nouveau)         : compte inactif créé, statut PENDING, email d'activation
          - Sans email                   : shell vide (pas de login), statut ACTIVE
        """
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        data = request.data

        identity = _get_identity(request.user)
        patient_role_profile = (
            identity.profiles.filter(role__name__iexact="PATIENT").first()
            if identity
            else None
        )
        if not patient_role_profile:
            return Response(
                {"error": "Only patients can add care team members."}, status=403
            )
        if not hasattr(patient_role_profile, "patient_profile"):
            return Response({"error": "Patient profile incomplete."}, status=400)

        patient_profile = patient_role_profile.patient_profile

        first_name = data.get("first_name")
        last_name = data.get("last_name")
        email = (data.get("email") or "").strip().lower() or None
        phone_number = data.get("phone_number")
        address = data.get("address")
        relation = data.get("relation_type", "Family")
        role_name = (data.get("role") or "FAMILY").strip().upper()

        if role_name not in {"FAMILY", "CAREGIVER", "NURSE"}:
            return Response(
                {"error": "Rôle invalide. Valeurs acceptées : FAMILY, CAREGIVER, NURSE."},
                status=400,
            )
        if not first_name or not last_name:
            return Response({"error": "Prénom et nom sont requis."}, status=400)

        role_obj, _ = Role.objects.get_or_create(name=role_name, defaults={"name": role_name})
        inviter_name = f"{identity.first_name} {identity.last_name}".strip() or "Votre proche"

        with transaction.atomic():
            if email:
                existing_auth = AuthAccount.objects.filter(email=email).first()

                if existing_auth:
                    # Proche déjà inscrit → lier directement
                    member_profile, _ = Profile.objects.get_or_create(
                        user=existing_auth.user, role=role_obj
                    )
                    team_member = PatientCareTeam.objects.create(
                        patient_profile=patient_profile,
                        member_profile=member_profile,
                        role=role_name,
                        relation_type=relation or "",
                        status=_get_invitation_status("ACTIVE"),
                        invitation_email=email,
                    )
                    send_care_team_invitation(email, inviter_name, role_name, is_existing_user=True)
                else:
                    # Nouveau proche → compte inactif + email d'activation
                    user_identity = User.objects.create(
                        first_name=first_name,
                        last_name=last_name,
                        phone_number=phone_number or "",
                        address=address or "",
                    )
                    auth_account = AuthAccount.objects.create_user(
                        email=email,
                        password=None,
                        user_identity=user_identity,
                    )
                    auth_account.is_active = False
                    auth_account.save(update_fields=["is_active"])

                    member_profile = Profile.objects.create(user=user_identity, role=role_obj)
                    team_member = PatientCareTeam.objects.create(
                        patient_profile=patient_profile,
                        member_profile=member_profile,
                        role=role_name,
                        relation_type=relation or "",
                        status=_get_invitation_status("PENDING"),
                        invitation_email=email,
                    )

                    uid = urlsafe_base64_encode(force_bytes(auth_account.pk))
                    token = PasswordResetTokenGenerator().make_token(auth_account)
                    send_proche_invitation(email, inviter_name, uid, token)

            else:
                # Pas d'email → shell vide, pas de login
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
                    status=_get_invitation_status("ACTIVE"),
                )

        return Response(
            {
                "message": "Membre ajouté à l'équipe.",
                "id": str(team_member.id_team_member),
                "status": team_member.status.label,
                "invitation_sent": email is not None,
            },
            status=201,
        )

    @action(
        detail=False,
        methods=["post"],
        url_path="activate-proche",
        permission_classes=[],
    )
    def activate_proche_account(self, request):
        """
        POST /api/doctors/care-team/activate-proche/
        Valide le token d'activation, fixe le mot de passe et active le compte proche.

        Corps JSON : uid, token, password
        """
        from django.utils.encoding import force_str
        from django.utils.http import urlsafe_base64_decode

        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password")

        if not uid or not token or not password:
            return Response({"error": "uid, token et password sont requis."}, status=400)

        try:
            auth_id = force_str(urlsafe_base64_decode(uid))
            auth_account = AuthAccount.objects.get(pk=auth_id)
        except (TypeError, ValueError, AuthAccount.DoesNotExist):
            return Response({"error": "Lien invalide."}, status=400)

        from apps.auth.tokens import email_verification_token as _token_gen
        if not _token_gen.check_token(auth_account, token):
            return Response({"error": "Lien expiré ou invalide."}, status=400)

        auth_account.set_password(password)
        auth_account.is_active = True
        auth_account.save(update_fields=["password", "is_active"])

        active_status = _get_invitation_status("ACTIVE")
        PatientCareTeam.objects.filter(
            member_profile__user=auth_account.user,
            status__label="PENDING",
        ).update(status=active_status)

        return Response({"message": "Compte activé avec succès."}, status=200)

    @action(detail=False, methods=["post"], url_path="invite-doctor")
    def invite_doctor(self, request):
        """
        Le patient invite un médecin (référent ou spécialiste) par email.
        L'email est envoyé au DOCTEUR invité.
        """
        email = (request.data.get("email") or "").strip().lower()
        role = (request.data.get("role") or "").strip()

        if not email:
            return Response({"error": "Email requis."}, status=400)
        if role not in (
            PatientCareTeam.TeamRole.REFERENT_DOCTOR,
            PatientCareTeam.TeamRole.SPECIALIST,
        ):
            return Response(
                {
                    "error": "Rôle invalide. Valeurs acceptées : REFERENT_DOCTOR, SPECIALIST."
                },
                status=400,
            )

        # Le patient ne peut pas s'inviter lui-même
        if email == request.user.email:
            return Response(
                {
                    "error": "Désolé, le rôle référent que vous cherchez à inviter n'existe pas. Contactez votre docteur."
                },
                status=400,
            )

        identity = _get_identity(request.user)
        patient_role_profile = (
            identity.profiles.filter(role__name__iexact="PATIENT").first()
            if identity
            else None
        )
        if not patient_role_profile:
            return Response(
                {"error": "Seuls les patients peuvent inviter un médecin."}, status=403
            )
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
                {
                    "error": "Désolé, le rôle référent que vous cherchez à inviter n'existe pas. Contactez votre docteur."
                },
                status=400,
            )

        member_profile = auth_account.user.profiles.filter(
            role__name__iexact="DOCTOR"
        ).first()
        if not member_profile or not getattr(member_profile, "doctor_profile", None):
            return Response(
                {
                    "error": "Désolé, le rôle référent que vous cherchez à inviter n'existe pas. Contactez votre docteur."
                },
                status=400,
            )
        # Docteur non validé = compte indisponible / inexistant pour le patient
        if member_profile.doctor_profile.verification_status.label != "VERIFIED":
            return Response(
                {
                    "error": "Désolé, le rôle référent que vous cherchez à inviter n'existe pas ou n'est pas encore disponible. Contactez votre docteur."
                },
                status=400,
            )

        # Éviter doublon
        if PatientCareTeam.objects.filter(
            patient_profile=patient_profile,
            member_profile=member_profile,
        ).exists():
            return Response(
                {
                    "error": "Ce médecin fait déjà partie de votre équipe ou a déjà une invitation en attente."
                },
                status=400,
            )

        invitation = PatientCareTeam.objects.create(
            patient_profile=patient_profile,
            member_profile=member_profile,
            role=role,
            status=pending_status,
        )
        # Email envoyé au DOCTEUR (destinataire = email du médecin)
        send_care_team_invitation(email, inviter_name, role, is_existing_user=True)

        return Response(
            {
                "message": "Invitation envoyée au médecin.",
                "id_team_member": str(invitation.id_team_member),
            },
            status=201,
        )

    @action(detail=False, methods=["post"], url_path="add-patient")
    def add_patient(self, request):
        """
        Le médecin ajoute un patient existant par email ou téléphone.
        """
        # request.user est AuthAccount; identity est User (propriétaire du profil)
        identity = _get_identity(request.user)
        if not identity or not hasattr(identity, "profiles"):
            return Response(
                {
                    "error": "Only doctors can perform this action. Use a doctor account token (e.g. Login as Doctor, then use that token)."
                },
                status=403,
            )
        doctor_profile = identity.profiles.filter(role__name__iexact="DOCTOR").first()
        if not doctor_profile:
            return Response(
                {
                    "error": "Only doctors can perform this action. This account has no doctor profile—log in with a verified doctor account."
                },
                status=403,
            )

        # Check if doctor is VERIFIED
        if (
            not hasattr(doctor_profile, "doctor_profile")
            or doctor_profile.doctor_profile.verification_status.label != "VERIFIED"
        ):
            return Response(
                {"error": "You must be a VERIFIED doctor to add patients."}, status=403
            )

        email = (request.data.get("email") or "").strip().lower()
        phone = (request.data.get("phone_number") or "").strip()

        if not email and not phone:
            return Response(
                {"error": "Email ou numéro de téléphone requis."}, status=400
            )

        # Le médecin ne peut pas s'ajouter lui-même comme patient
        if email == request.user.email:
            return Response(
                {"error": "Vous ne pouvez pas vous ajouter vous-même comme patient."},
                status=400,
            )

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
                send_care_team_invitation(
                    email, inviter_name, "PATIENT", is_existing_user=False
                )
                return Response(
                    {"message": "Patient not found, invitation email sent"}, status=200
                )
            return Response({"error": "Patient not found in database"}, status=404)

        # Get Patient Profile
        target_patient_profile = None
        # Check profiles
        patient_role_profile = target_user.profiles.filter(role__name="PATIENT").first()
        if patient_role_profile and hasattr(patient_role_profile, "patient_profile"):
            target_patient_profile = patient_role_profile.patient_profile

        if not target_patient_profile:
            return Response(
                {"error": "User found but is not a registered patient"}, status=404
            )

        pending_status = _get_invitation_status("PENDING")

        # Check existence
        if PatientCareTeam.objects.filter(
            patient_profile=target_patient_profile, member_profile=doctor_profile
        ).exists():
            return Response({"error": "Relation already exists"}, status=400)

        invitation = PatientCareTeam.objects.create(
            patient_profile=target_patient_profile,
            member_profile=doctor_profile,
            role="REFERENT_DOCTOR",
            status=pending_status,
            approved_by=doctor_profile.doctor_profile,
        )

        # Email envoyé au PATIENT invité (jamais au médecin) — récupération sécurisée
        inviter_name = f"Dr. {request.user.user.last_name}"
        patient_email = email or (
            AuthAccount.objects.filter(user=target_user)
            .values_list("email", flat=True)
            .first()
            or ""
        )
        if patient_email:
            try:
                send_care_team_invitation(
                    patient_email, inviter_name, "PATIENT", is_existing_user=True
                )
            except Exception as e:
                logger.error(f"Erreur lors de l'envoi de l'invitation patient: {e}")
                # L'invitation est créée même si l'email échoue

        return Response(
            {
                "message": "Invitation envoyée au patient.",
                "id_team_member": str(invitation.id_team_member),
            },
            status=201,
        )

    @action(detail=False, methods=["post"], url_path="accept-invitation")
    def accept_invitation(self, request):
        """
        Accepter une invitation (médecin ou patient). Passe le statut à ACTIVE.
        """
        id_team_member = request.data.get("id_team_member") or request.query_params.get(
            "id_team_member"
        )
        if not id_team_member:
            return Response({"error": "id_team_member requis."}, status=400)

        try:
            entry = PatientCareTeam.objects.get(
                id_team_member=id_team_member, status__label="PENDING"
            )
        except PatientCareTeam.DoesNotExist:
            return Response(
                {"error": "Invitation introuvable ou déjà traitée."}, status=404
            )

        current_user_id = getattr(request.user, "user_id", None) or (
            request.user.user.pk if getattr(request.user, "user", None) else None
        )
        if not current_user_id:
            return Response({"error": "Utilisateur non identifié."}, status=403)
        # Vérifier que l'utilisateur connecté est le médecin invité ou le patient invité (sans requête AuthAccount)
        is_doctor_invited = bool(
            entry.member_profile and entry.member_profile.user_id == current_user_id
        )
        patient_profile_obj = getattr(entry, "patient_profile", None)
        patient_identity_id = None
        if patient_profile_obj and getattr(patient_profile_obj, "profile", None):
            patient_identity_id = getattr(
                patient_profile_obj.profile, "user_id", None
            ) or (
                patient_profile_obj.profile.user.pk
                if patient_profile_obj.profile.user
                else None
            )
        is_patient_invited = (
            patient_identity_id is not None and patient_identity_id == current_user_id
        )

        if not is_doctor_invited and not is_patient_invited:
            return Response(
                {"error": "Vous ne pouvez pas accepter cette invitation."}, status=403
            )

        active_status = _get_invitation_status("ACTIVE")
        with transaction.atomic():
            entry.status = active_status
            entry.save(update_fields=["status", "updated_at"])

        return Response(
            {"message": "Invitation acceptée.", "status": "ACTIVE"}, status=200
        )

    @action(detail=False, methods=["post"], url_path="decline-invitation")
    def decline_invitation(self, request):
        id_team_member = request.data.get("id_team_member")
        reason = request.data.get("reason", "Aucun motif spécifié.")

        if not id_team_member:
            return Response({"error": "id_team_member requis."}, status=400)

        try:
            entry = PatientCareTeam.objects.get(
                id_team_member=id_team_member, status__label="PENDING"
            )
        except PatientCareTeam.DoesNotExist:
            return Response({"error": "Invitation introuvable."}, status=404)

        current_identity = _get_identity(request.user)
        if not current_identity:
            return Response({"error": "Utilisateur non identifié."}, status=403)

        is_doctor = bool(
            entry.member_profile and entry.member_profile.user == current_identity
        )
        is_patient = bool(
            entry.patient_profile
            and entry.patient_profile.profile.user == current_identity
        )

        if not is_doctor and not is_patient:
            return Response({"error": "Action non autorisée."}, status=403)

        rejected_status = _get_invitation_status("REJECTED")

        with transaction.atomic():
            entry.status = rejected_status
            entry.rejection_reason = reason
            entry.save(update_fields=["status", "rejection_reason", "updated_at"])

            if is_doctor:
                patient_auth = AuthAccount.objects.filter(
                    user=entry.patient_profile.profile.user
                ).first()
                if patient_auth:
                    doctor_name = f"Dr. {current_identity.last_name}"
                    send_push_to_user(
                        patient_auth,
                        title="Invitation refusée",
                        body=f"Désolé, le {doctor_name} a refusé votre invitation. Motif : {reason}",
                        data={"type": "INVITATION_REJECTED", "id": str(id_team_member)},
                    )

        return Response({"message": "Invitation déclinée.", "status": "REJECTED"})

    @action(detail=False, methods=["get"], url_path="my-team")
    def my_team(self, request):
        """
        Récupère l'équipe de soin de l'utilisateur connecté.
        """
        user = _get_identity(request.user)

        # Check if Patient
        patient_role = (
            user.profiles.filter(role__name__iexact="PATIENT").first() if user else None
        )
        if patient_role and hasattr(patient_role, "patient_profile"):
            return self._get_patient_team(patient_role.patient_profile)

        # Check if Doctor
        doctor_role = (
            user.profiles.filter(role__name__iexact="DOCTOR").first() if user else None
        )
        if doctor_role and hasattr(doctor_role, "doctor_profile"):
            return self._get_doctor_patients(doctor_role)

        return Response({"error": "Profile not found"}, status=404)

    def _get_patient_team(self, patient_profile):
        team = PatientCareTeam.objects.filter(patient_profile=patient_profile)

        # Categories
        doctors = team.filter(
            role__in=["REFERENT_DOCTOR", "SPECIALIST"], status__label="ACTIVE"
        )
        pending_doctor_invites = team.filter(
            role__in=["REFERENT_DOCTOR", "SPECIALIST"], status__label="PENDING"
        )
        family = team.filter(
            role__in=["FAMILY", "CAREGIVER", "NURSE"], status__label="ACTIVE"
        )
        data = {
            "doctors": PatientCareTeamSerializer(doctors, many=True).data,
            "pending_doctor_invites": PatientCareTeamSerializer(pending_doctor_invites, many=True).data,
            "family": PatientCareTeamSerializer(family, many=True).data,
        }
        return Response(data)

    def _get_doctor_patients(self, doctor_profile):
        # Doctor is the 'member' in the relation
        relations = PatientCareTeam.objects.filter(member_profile=doctor_profile)

        active = relations.filter(status__label="ACTIVE")
        pending = relations.filter(status__label="PENDING")

        data = {
            "active_patients": PatientCareTeamSerializer(active, many=True).data,
            "pending_invites": PatientCareTeamSerializer(pending, many=True).data,
        }
        return Response(data)

    @action(detail=False, methods=["post"], url_path="remove-member")
    def remove_member(self, request):
        """
        Le patient retire un membre (médecin actif ou invitation en attente) de son équipe de soin.
        """
        id_team_member = request.data.get("id_team_member")
        if not id_team_member:
            return Response({"error": "id_team_member requis."}, status=400)

        identity = _get_identity(request.user)
        patient_role_profile = (
            identity.profiles.filter(role__name__iexact="PATIENT").first()
            if identity else None
        )
        if not patient_role_profile or not hasattr(patient_role_profile, "patient_profile"):
            return Response({"error": "Seuls les patients peuvent retirer un membre."}, status=403)

        try:
            entry = PatientCareTeam.objects.get(
                id_team_member=id_team_member,
                patient_profile=patient_role_profile.patient_profile,
            )
        except PatientCareTeam.DoesNotExist:
            return Response({"error": "Membre introuvable."}, status=404)

        entry.delete()
        return Response({"message": "Membre retiré de l'équipe."}, status=200)

    @action(detail=False, methods=["patch"], url_path="update-member")
    def update_member(self, request):
        """
        PATCH /api/doctors/care-team/update-member/
        Modifie les informations d'un proche (famille / aidant) de l'équipe du patient.

        Corps JSON :
          id_team_member  — requis (UUID)
          first_name      — optionnel
          last_name       — optionnel
          phone_number    — optionnel
          address         — optionnel
          relation_type   — optionnel
        """
        id_team_member = request.data.get("id_team_member")
        if not id_team_member:
            return Response({"error": "id_team_member requis."}, status=400)

        identity = _get_identity(request.user)
        patient_role_profile = (
            identity.profiles.filter(role__name__iexact="PATIENT").first()
            if identity else None
        )
        if not patient_role_profile or not hasattr(patient_role_profile, "patient_profile"):
            return Response({"error": "Seuls les patients peuvent modifier un membre."}, status=403)

        try:
            entry = PatientCareTeam.objects.select_related("member_profile__user").get(
                id_team_member=id_team_member,
                patient_profile=patient_role_profile.patient_profile,
                role__in=["FAMILY", "CAREGIVER", "NURSE"],
            )
        except PatientCareTeam.DoesNotExist:
            return Response({"error": "Membre introuvable."}, status=404)

        member_user = entry.member_profile.user

        updatable_user_fields = ("first_name", "last_name", "phone_number", "address")
        user_changed = False
        for field in updatable_user_fields:
            if field in request.data:
                setattr(member_user, field, request.data[field])
                user_changed = True
        if user_changed:
            member_user.save(update_fields=[f for f in updatable_user_fields if f in request.data])

        if "relation_type" in request.data:
            entry.relation_type = request.data["relation_type"]
            entry.save(update_fields=["relation_type"])

        return Response({
            "message": "Membre mis à jour.",
            "id_team_member": str(entry.id_team_member),
            "first_name": member_user.first_name,
            "last_name": member_user.last_name,
            "phone_number": member_user.phone_number,
            "address": member_user.address,
            "relation_type": entry.relation_type,
        })

    @action(detail=False, methods=["get"], url_path="patient-dashboard")
    def get_patient_dashboard(self, request):
        """
        Résumé du tableau de bord d'un patient.
        Accessible uniquement aux médecins avec une relation ACTIVE.
        """
        patient_user_id = request.query_params.get("patient_user_id")
        user, error_response = self._verify_doctor_access(request, patient_user_id)
        if error_response:
            return error_response

        data = DoctorPatientDataService.get_patient_dashboard(user)
        return Response(data)

    def _verify_doctor_access(self, request, patient_user_id):
        return verify_doctor_can_access_patient(request, patient_user_id)

    @action(detail=False, methods=["get"], url_path="patient-meals")
    def get_patient_meals(self, request):
        patient_id = request.query_params.get("patient_user_id")
        user, error_response = self._verify_doctor_access(request, patient_id)
        if error_response:
            return error_response

        from apps.doctors.services import DoctorPatientDataService

        data = DoctorPatientDataService.get_meals_history(user)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="patient-medications")
    def get_patient_medications(self, request):
        patient_id = request.query_params.get("patient_user_id")
        user, error_response = self._verify_doctor_access(request, patient_id)
        if error_response:
            return error_response

        from apps.doctors.services import DoctorPatientDataService

        data = DoctorPatientDataService.get_medications_history(user)
        return Response(data)

    @action(detail=False, methods=["get"], url_path="patient-glycemia")
    def get_patient_glycemia(self, request):
        patient_id = request.query_params.get("patient_user_id")
        user, error_response = self._verify_doctor_access(request, patient_id)
        if error_response:
            return error_response

        from apps.doctors.services import DoctorPatientDataService

        data = DoctorPatientDataService.get_glycemia_history(user)
        return Response(data)

    # ------------------------------------------------------------------ #
    #  Endpoints Proche                                                    #
    # ------------------------------------------------------------------ #

    @action(detail=False, methods=["get"], url_path="my-linked-patient")
    def my_linked_patient(self, request):
        """
        GET /api/doctors/care-team/my-linked-patient/
        Retourne les infos de base du patient lié au proche connecté.
        """
        patient_auth, entry, error = verify_proche_can_access_patient(request)
        if error:
            return error

        patient_user = patient_auth.user
        patient_profile = None
        profile_obj = patient_user.profiles.filter(role__name__iexact="PATIENT").first()
        if profile_obj and hasattr(profile_obj, "patient_profile"):
            patient_profile = profile_obj.patient_profile

        return Response({
            "patient_user_id": str(patient_user.id_user),
            "first_name": patient_user.first_name,
            "last_name": patient_user.last_name,
            "diabetes_type": getattr(patient_profile, "diabetes_type", None),
            "relation_type": entry.relation_type,
        })

    @action(detail=False, methods=["get"], url_path="proche-glycemia")
    def get_proche_glycemia(self, request):
        """
        GET /api/doctors/care-team/proche-glycemia/
        Historique glycémie du patient lié, accessible au proche connecté.
        """
        patient_auth, _, error = verify_proche_can_access_patient(request)
        if error:
            return error

        from apps.doctors.services import DoctorPatientDataService
        return Response(DoctorPatientDataService.get_glycemia_history(patient_auth))

    @action(detail=False, methods=["get"], url_path="proche-dashboard")
    def get_proche_dashboard(self, request):
        """
        GET /api/doctors/care-team/proche-dashboard/
        Résumé tableau de bord du patient lié, accessible au proche connecté.
        """
        patient_auth, _, error = verify_proche_can_access_patient(request)
        if error:
            return error

        from apps.doctors.services import DoctorPatientDataService
        return Response(DoctorPatientDataService.get_patient_dashboard(patient_auth))
