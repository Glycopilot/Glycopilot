from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    medical_comment = models.TextField(blank=True, null=True)
    actif = models.BooleanField(default=True)
    linked_user_id = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    profiles = models.ManyToManyField(
        "profiles.Profile", through="UserProfile", related_name="users"
    )

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"


class UserProfile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    profil = models.ForeignKey("profiles.Profile", on_delete=models.CASCADE)

    class Meta:
        db_table = "users_profils"
        unique_together = ("user", "profil")
