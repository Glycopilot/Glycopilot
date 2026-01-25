from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import DoctorProfile, PatientCareTeam, InvitationStatus
from ..serializers import DoctorSerializer, SimpleUserSerializer

class DoctorAssociationsView(APIView):
    """
    API View to retrieve association data between doctors and patients using PatientCareTeam.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Retrieve all doctors from the database
        doctors = DoctorProfile.objects.all()
        
        results = []
        for doctor in doctors:
            # Get patients associated with this specific doctor (Active relations)
            try:
                active_status = InvitationStatus.objects.get(label='ACTIVE')
                
                # Filter CareTeam where member is this doctor and role is DOCTOR related
                
                relations = PatientCareTeam.objects.filter(
                    member_profile=doctor.profile,
                    status=active_status,
                    role__in=["REFERENT_DOCTOR", "SPECIALIST"]
                ).select_related('patient_profile__profile__user')
            except InvitationStatus.DoesNotExist:
                relations = PatientCareTeam.objects.none()
            
            if relations.exists():
                # Extract User objects from the patient profile relations
                patients = [r.patient_profile.profile.user for r in relations]
                
                results.append({
                    "doctor": DoctorSerializer(doctor).data,
                    "patients": SimpleUserSerializer(patients, many=True).data
                })

        # Return the same data for both keys as requested (Doctor -> [Patients])
        return Response({
            "patients_par_medecin": results,
            "medecins_avec_patients": results
        })
