from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.doctors.doctor_patient_access import verify_doctor_can_access_patient
from apps.doctors.serializers import PatientHbA1cMedicalUpdateSerializer
from apps.users.serializers import UserSerializer


class DoctorPatientMedicalView(APIView):
    """
    PATCH /api/doctors/patients/{patient_id}/medical/
    Médecin référent / spécialiste (care team ACTIVE) met à jour l'HbA1c du patient.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, patient_id):
        patient_auth, error_response = verify_doctor_can_access_patient(
            request, str(patient_id)
        )
        if error_response:
            return error_response

        serializer = PatientHbA1cMedicalUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_identity = patient_auth.user
        patient_role = user_identity.profiles.filter(
            role__name__iexact="PATIENT"
        ).first()
        if not patient_role or not hasattr(patient_role, "patient_profile"):
            return Response({"error": "Patient profile not found."}, status=404)

        pp = patient_role.patient_profile
        pp.hba1c = serializer.validated_data["hba1c"]
        pp.save(update_fields=["hba1c", "updated_at"])

        return Response(UserSerializer(user_identity).data)
