from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Doctor
from .serializers import DoctorListWithPatientsSerializer, DoctorSerializer, SimpleUserSerializer
from apps.users.models import User

class DoctorAssociationsView(APIView):
    """
    API View to retrieve association data between doctors and patients.
    Returns two lists as requested:
    1. Patients grouped by doctor.
    2. Doctors with their associated patients.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Retrieve all doctors from the database
        doctors = Doctor.objects.all()
        
        results = []
        for doctor in doctors:
            # Get patients associated with this specific doctor
            # Querying User model directly via medical_id Foreign Key
            patients = User.objects.filter(medical_id=doctor)
            
            # Construct the result object for this doctor if they have patients
            if patients.exists(): 
                 results.append({
                     "doctor": DoctorSerializer(doctor).data,
                     "patients": SimpleUserSerializer(patients, many=True).data
                 })

        # Return the same data for both keys as requested (Doctor -> [Patients])
        
        return Response({
            "patients_par_medecin": results,
            "medecins_avec_patients": results
        })
