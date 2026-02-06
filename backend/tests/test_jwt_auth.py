from django.contrib.auth import get_user_model
from django.test import override_settings

import jwt
import pytest
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import AccessToken

from utils.jwt_auth import JWTAuthenticationDualKey

User = get_user_model()


@pytest.mark.django_db
@override_settings(SECRET_KEY="secret_key_main", SECRET_KEY_ADMIN="secret_key_admin")
def test_dual_key_accepts_default_secret():
    user = User.objects.create_user(email="u@test.com", password="pass123")
    token = AccessToken.for_user(user)
    auth = JWTAuthenticationDualKey()
    validated = auth.get_validated_token(str(token))
    assert validated.get("user_id") == str(user.id_auth)


@pytest.mark.django_db
@override_settings(SECRET_KEY="secret_key_main", SECRET_KEY_ADMIN="secret_key_admin")
def test_dual_key_accepts_admin_secret():
    user = User.objects.create_user(email="admin@test.com", password="pass123")
    token = AccessToken.for_user(user)
    payload = token.payload
    algo = getattr(api_settings, "ALGORITHM", "HS256")
    raw = jwt.encode(payload, "secret_key_admin", algorithm=algo)
    auth = JWTAuthenticationDualKey()
    validated = auth.get_validated_token(raw)
    assert validated.get("user_id") == str(user.id_auth)


@pytest.mark.django_db
@override_settings(SECRET_KEY="secret_key_main", SECRET_KEY_ADMIN="secret_key_admin")
def test_dual_key_rejects_invalid_token():
    auth = JWTAuthenticationDualKey()
    with pytest.raises(InvalidToken):
        auth.get_validated_token("bad.token.value")
