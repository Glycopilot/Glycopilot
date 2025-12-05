from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from .models import User
from .serializers import UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser or getattr(user, "role", None) == User.Role.ADMIN:
            return User.objects.all()
        return User.objects.filter(id=user.id)

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_superuser or getattr(user, "role", None) == User.Role.ADMIN:
            serializer.save()
        else:
            raise PermissionDenied("Seuls les administrateurs peuvent créer des utilisateurs.")

    def perform_update(self, serializer):
        user = self.request.user
        if user.is_superuser or getattr(user, "role", None) == User.Role.ADMIN:
            serializer.save()
        else:
            if serializer.instance.id != user.id:
                raise PermissionDenied("Accès refusé.")
            serializer.save()
