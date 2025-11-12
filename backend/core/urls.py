from django.urls import include, path

urlpatterns = [
    path("api/auth/", include("apps.auth.urls")),
    path("api/users/", include("apps.users.urls")),
]
