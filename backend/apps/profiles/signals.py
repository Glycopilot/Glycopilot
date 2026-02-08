from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Profile, PatientProfile
from apps.doctors.models import DoctorProfile

@receiver(post_save, sender=Profile)
def create_related_profile(sender, instance, created, **kwargs):
    """
    Automatically create a PatientProfile or DoctorProfile when a Profile is created.
    """
    if created:
        if instance.role.name == "PATIENT":
            PatientProfile.objects.get_or_create(profile=instance)
        elif instance.role.name == "DOCTOR":
            DoctorProfile.objects.get_or_create(profile=instance, license_number=f"TEMP-{instance.id_profile}")
