from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.http import require_GET

from decouple import config


@require_GET
def root_view(request):
    return JsonResponse({"message": "Server is running"})


ADMIN_URL = config("ADMIN_URL", default="admin")

urlpatterns = [
    path("", root_view),
    path(f"{ADMIN_URL}/", admin.site.urls),
    path(
        "api/password_reset/",
        include("django_rest_passwordreset.urls", namespace="password_reset"),
    ),
    path("api/auth/", include("apps.auth.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/activities/", include("apps.activities.urls")),
    path("api/alerts/", include("apps.alerts.urls")),
    path("api/glycemia/", include("apps.glycemia.urls")),
    path("api/devices/", include("apps.devices.urls")),
    path("api/doctors/", include("apps.doctors.urls")),
    path("api/meals/", include("apps.meals.urls")),
    path("api/medications/", include("apps.medications.urls")),
    path("api/v1/dashboard/", include("apps.dashboard.urls")),
    path("api/devices/", include("apps.devices.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]
