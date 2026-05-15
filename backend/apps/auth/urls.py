from django.urls import path

from . import views

urlpatterns = [
    # Routes avec et sans trailing slash pour compatibilité frontend
    path("register", views.register, name="register"),
    path("register/", views.register),
    path("confirm-email", views.confirm_email, name="confirm_email"),
    path("confirm-email/", views.confirm_email),
    path("verify-email", views.verify_email, name="verify_email"),
    path("verify-email/", views.verify_email),
    path("resend-verification", views.resend_verification, name="resend_verification"),
    path("resend-verification/", views.resend_verification),
    path("login", views.login, name="login"),
    path("login/", views.login),
    path("logout", views.logout, name="logout"),
    path("logout/", views.logout),
    path("refresh", views.refresh_token, name="refresh_token"),
    path("refresh/", views.refresh_token),
    path("me", views.me, name="me"),
    path("me/", views.me),
    path("create-admin", views.create_admin_account, name="create_admin_account"),
    path("create-admin/", views.create_admin_account),
]
