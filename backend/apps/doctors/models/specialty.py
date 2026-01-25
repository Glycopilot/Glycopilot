import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _

class Specialty(models.Model):
    id_specialty = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True, verbose_name=_("Specialty Name"))
    description = models.TextField(blank=True, null=True, verbose_name=_("Description"))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "specialties"
        verbose_name = _("Specialty")
        verbose_name_plural = _("Specialties")
        ordering = ["name"]

    def __str__(self):
        return self.name
