import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _

class Profile(models.Model):
    id_profile = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        "users.User",
        on_delete=models.CASCADE,
        related_name="profiles",
        db_column="id_user",
    )
    role = models.ForeignKey(
        "profiles.Role",
        on_delete=models.PROTECT,
        related_name="profiles",
    )
    label = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"
        unique_together = ("user", "role")
        verbose_name = _("Profile")
        verbose_name_plural = _("Profiles")

    def __str__(self):
        return f"{self.user} - {self.role.name}"
