from django.urls import path, include

from . import views

urlpatterns = [
    path("register", views.register, name="register"),
    path("register/", views.register),
    path("login", views.login, name="login"),
    path("login/", views.login),
    path("logout", views.logout, name="logout"),
    path("logout/", views.logout),
    path("refresh", views.refresh_token, name="refresh_token"),
    path("refresh/", views.refresh_token),
    path("me", views.me, name="me"),
    path("me/", views.me),
]
