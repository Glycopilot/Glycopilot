import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils.translation import gettext_lazy as _
from .user_identity import User

class AuthAccountManager(BaseUserManager):
    def create_user(self, email, password=None, user_identity=None, **extra_fields):
        if not email:
            raise ValueError(_("L'email est obligatoire"))
        email = self.normalize_email(email)

        if not user_identity:
            user_identity = User.objects.create()

        account = self.model(email=email, user=user_identity, **extra_fields)
        account.set_password(password)
        account.save()
        return account

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        identity = User.objects.create(first_name="Super", last_name="Admin")
        return self.create_user(email, password, user_identity=identity, **extra_fields)


class AuthAccount(AbstractBaseUser, PermissionsMixin):
    id_auth = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="auth_account",
        db_column="id_user",
    )
    email = models.EmailField(unique=True)
    password_algo = models.CharField(max_length=50, default="argon2id")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = AuthAccountManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "auth_accounts"
        verbose_name = _("Auth Account")
        verbose_name_plural = _("Auth Accounts")

    def __str__(self):
        return self.email

    @property
    def role(self):
        if hasattr(self, "user") and self.user.profiles.exists():
            # Return the first role found, in lowercase to match permissions
            return self.user.profiles.first().role.name.lower()
        return None
