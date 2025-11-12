from django.conf import settings
from django.db import models


class Contact(models.Model):
    contact_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contacts"
    )
    name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    TYPE_CHOICES = [("family", "Family"), ("doctor", "Doctor"), ("other", "Other")]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="other")

    class Meta:
        db_table = "contact"
