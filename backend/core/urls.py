from django.contrib import admin
from django.urls import include, path
from django.contrib import admin
urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/password_reset/',  include("django_rest_passwordreset.urls", namespace="password_reset")),
    path("api/auth/", include("apps.auth.urls")),
    path("api/users/", include("apps.users.urls")),
]
