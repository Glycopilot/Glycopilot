from django.urls import path

from . import views

urlpatterns = [
    path("register", views.register, name="register"),
    path("login", views.login, name="login"),
    path("logout", views.logout, name="logout"),
    path("refresh", views.refresh_token, name="refresh_token"),
    path("me", views.me, name="me"),
    path("forgot", views.me, name="forgot"),
]
