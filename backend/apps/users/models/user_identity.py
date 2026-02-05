import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _

class User(models.Model):
    id_user = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users"
        verbose_name = _("User Identity")
        verbose_name_plural = _("User Identities")

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
