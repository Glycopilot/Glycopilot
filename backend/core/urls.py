from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('apps.auth.urls')),
    path('api/users/', include('apps.users.urls')),
]
