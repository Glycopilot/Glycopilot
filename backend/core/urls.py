from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('apps.users.urls')),
    path('api/medications/', include('apps.medications.urls')),
    path('api/activities/', include('apps.activities.urls')),
    path('api/meals/', include('apps.meals.urls')),
    path('api/glycemia/', include('apps.glycemia.urls')),
    path('api/alerts/', include('apps.alerts.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/contacts/', include('apps.contacts.urls')),
    path('api/doctors/', include('apps.doctors.urls')),
    path('api/profiles/', include('apps.profiles.urls')),
]
