import pytest
from django.urls import reverse
from rest_framework import status
from apps.users.models import AuthAccount, User
from apps.profiles.models import Profile, Role

@pytest.mark.django_db
class TestAuthEndpoints:
    
    @pytest.fixture(autouse=True)
    def setup_base_data(self):
        # Create mandatory roles
        self.patient_role = Role.objects.create(name="PATIENT")
        self.doctor_role = Role.objects.create(name="DOCTOR")

    def test_register_creates_all_entities(self, client):
        """
        Verify /register creates User, AuthAccount and Profile
        """
        url = reverse("register")
        data = {
            "email": "test@gmail.com",
            "password": "StrongPassword123!",
            "password_confirm": "StrongPassword123!",
            "first_name": "John",
            "last_name": "Doe",
            "role": "PATIENT"
        }
        
        response = client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify DB
        assert AuthAccount.objects.count() == 1
        account = AuthAccount.objects.first()
        assert account.email == "test@gmail.com"
        
        # Check Identity link
        identity = account.user
        assert identity.first_name == "John"
        
        # Check Profile link
        assert Profile.objects.filter(user=identity, role__name="PATIENT").exists()

    def test_login_success(self, client):
        # Setup User
        identity = User.objects.create(first_name="Jane", last_name="Doe")
        account = AuthAccount.objects.create_user(
            email="jane@gmail.com",
            password="Password123", 
            user_identity=identity
        )
        Profile.objects.create(user=identity, role=self.patient_role)
        
        url = reverse("login")
        data = {"email": "jane@gmail.com", "password": "Password123"}
        response = client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        
        # Verify profile data
        user_data = response.data["user"]
        assert "identity" in user_data
        identity_data = user_data["identity"]
        assert "profiles" in identity_data
        
        profiles = identity_data["profiles"]
        assert len(profiles) == 1
        assert profiles[0]["role_name"] == "PATIENT"

    def test_forgot_password_sends_email(self, mailoutbox, client):
        # Setup User
        identity = User.objects.create(first_name="Forgot", last_name="User")
        AuthAccount.objects.create_user(
            email="forgot@gmail.com",
            password="Password123", 
            user_identity=identity
        )
        
        # django_rest_passwordreset endpoint
        url = reverse("password_reset:reset-password-request")
        data = {"email": "forgot@gmail.com"}
        
        response = client.post(url, data)
        assert response.status_code == status.HTTP_200_OK
        
        # Check email sent
        assert len(mailoutbox) == 1
        assert mailoutbox[0].to == ["forgot@gmail.com"]
        assert "reset-password?token=" in mailoutbox[0].body
