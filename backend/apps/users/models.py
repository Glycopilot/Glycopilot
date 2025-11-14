from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

# Custom Manager
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email doit être fourni")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Le superuser doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Le superuser doit avoir is_superuser=True.")
        return self.create_user(email, password, **extra_fields)

# Modèle User
class User(AbstractUser):
    class Role(models.TextChoices):
        PATIENT = "patient", "Patient"
        DOCTOR = "doctor", "Doctor"
        ADMIN = "admin", "Admin"

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    medical_comment = models.TextField(blank=True, null=True)
    actif = models.BooleanField(default=True)
    linked_user_id = models.IntegerField(blank=True, null=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    profiles = models.ManyToManyField(
        "profiles.Profile", through="UserProfile", related_name="users"
    )

    objects = CustomUserManager()  # Relie le CustomUserManager

    USERNAME_FIELD = "email"  # email comme identifiant
    REQUIRED_FIELDS = []       # pas de champs obligatoires supplémentaires

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def save(self, *args, **kwargs):
        # S'assurer qu'un superuser conserve toujours le rôle admin
        if self.is_superuser:
            self.role = self.Role.ADMIN
        super().save(*args, **kwargs)


# Modèle UserProfile
class UserProfile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    profil = models.ForeignKey("profiles.Profile", on_delete=models.CASCADE)

    class Meta:
        db_table = "users_profils"
        unique_together = ("user", "profil")
