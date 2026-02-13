from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.http import require_GET


@require_GET
def root_view(request):
    return JsonResponse({"message": "Server is running"})


urlpatterns = [
    path("", root_view),
    path("admin/", admin.site.urls),
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
]
