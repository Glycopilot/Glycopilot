import pytest
from decimal import Decimal

from django.core.exceptions import ValidationError

from apps.profiles.models import Profile, Role
from apps.profiles.models.patient_profile import PatientProfile
from apps.users.models import User as UserIdentity

# ─── Fixtures ────────────────────────────────────────────────────


@pytest.fixture
def patient_role(db):
    role, _ = Role.objects.get_or_create(name="PATIENT")
    return role


@pytest.fixture
def doctor_role(db):
    role, _ = Role.objects.get_or_create(name="DOCTOR")
    return role


@pytest.fixture
def user_identity(db):
    return UserIdentity.objects.create(first_name="Jean", last_name="Dupont")


@pytest.fixture
def profile(user_identity, patient_role):
    return Profile.objects.create(user=user_identity, role=patient_role)


@pytest.fixture
def patient_profile(profile):
    obj, _ = PatientProfile.objects.get_or_create(profile=profile)
    return obj


# ═══════════════════════════════════════════════════════════════════
# 1. ROLE
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestRoleModel:
    def test_role_creation(self, patient_role):
        assert patient_role.name == "PATIENT"

    def test_role_name_is_unique(self, patient_role):
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            Role.objects.create(name="PATIENT")

    def test_role_str(self, patient_role):
        assert str(patient_role) == "PATIENT"


# ═══════════════════════════════════════════════════════════════════
# 2. PROFILE
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestProfileModel:
    def test_profile_creation(self, profile, user_identity, patient_role):
        assert profile.user == user_identity
        assert profile.role == patient_role
        assert profile.is_active is True

    def test_profile_is_active_by_default(self, profile):
        assert profile.is_active is True

    def test_profile_label_optional(self, profile):
        assert profile.label is None

    def test_profile_timestamps_set(self, profile):
        assert profile.created_at is not None
        assert profile.updated_at is not None

    def test_profile_str(self, profile, user_identity):
        assert user_identity.first_name in str(profile)


# ═══════════════════════════════════════════════════════════════════
# 3. PATIENT PROFILE
# ═══════════════════════════════════════════════════════════════════


@pytest.mark.django_db
class TestPatientProfileModel:
    def test_patient_profile_creation(self, patient_profile, profile):
        assert patient_profile.profile == profile
        assert patient_profile.diabetes_type is None
        assert patient_profile.hba1c is None

    def test_hba1c_valid_value(self, patient_profile):
        patient_profile.hba1c = Decimal("7.5")
        patient_profile.full_clean()
        patient_profile.save()
        assert PatientProfile.objects.get(pk=patient_profile.pk).hba1c == Decimal("7.5")

    def test_hba1c_minimum_boundary(self, patient_profile):
        patient_profile.hba1c = Decimal("4.0")
        patient_profile.full_clean()

    def test_hba1c_maximum_boundary(self, patient_profile):
        patient_profile.hba1c = Decimal("15.0")
        patient_profile.full_clean()

    def test_hba1c_below_minimum_rejected(self, patient_profile):
        patient_profile.hba1c = Decimal("3.9")
        with pytest.raises(ValidationError):
            patient_profile.full_clean()

    def test_hba1c_above_maximum_rejected(self, patient_profile):
        patient_profile.hba1c = Decimal("15.1")
        with pytest.raises(ValidationError):
            patient_profile.full_clean()

    def test_hba1c_null_allowed(self, patient_profile):
        patient_profile.hba1c = None
        patient_profile.full_clean()

    def test_diabetes_type_choices(self, patient_profile):
        for dt in ["TYPE1", "TYPE2", "GESTATIONAL"]:
            patient_profile.diabetes_type = dt
            patient_profile.full_clean()

    def test_invalid_diabetes_type_rejected(self, patient_profile):
        patient_profile.diabetes_type = "UNKNOWN_TYPE"
        with pytest.raises(ValidationError):
            patient_profile.full_clean()

    def test_patient_profile_str(self, patient_profile):
        assert "Jean" in str(patient_profile)
