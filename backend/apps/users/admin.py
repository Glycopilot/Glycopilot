from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User, AuthAccount
from apps.profiles.models import Profile

class ProfileInline(admin.TabularInline):
    """Inline view for Profiles in User admin"""
    model = Profile
    extra = 0
    min_num = 0

@admin.register(User)
class UserIdentityAdmin(admin.ModelAdmin):
    """Admin pour l'identité utilisateur (Données métier)."""
    list_display = ("first_name", "last_name", "phone_number", "created_at")
    search_fields = ("first_name", "last_name", "phone_number")
    ordering = ("-created_at",)
    inlines = [ProfileInline]

    fieldsets = (
        ("Informations Personnelles", {
            "fields": ("first_name", "last_name", "birth_date", "gender")
        }),
        ("Coordonnées", {
            "fields": ("phone_number", "address")
        }),
        ("Médical", {
            "fields": ("medical_comment",)
        }),
        ("Meta", {
            "fields": ("created_at",),
            "classes": ("collapse",)
        }),
    )
    readonly_fields = ("created_at",)


@admin.register(AuthAccount)
class AuthAccountAdmin(BaseUserAdmin):
    """Admin pour le compte d'authentification (Django User)."""
    list_display = ("email", "is_active", "is_staff", "is_superuser", "created_at")
    list_filter = ("is_active", "is_staff", "is_superuser")
    search_fields = ("email",)
    ordering = ("email",)
    
    # Configuration spécifique pour notre modèle d'auth par Email
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Identité Liée", {"fields": ("user",)}), # Lien vers UserIdentity
        ("Permissions", {
            "fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")
        }),
        ("Dates", {"fields": ("last_login", "created_at")}),
    )
    
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password", "password_2", "user"), # user est requis à la création
        }),
    )
    
    readonly_fields = ("created_at", "last_login")

