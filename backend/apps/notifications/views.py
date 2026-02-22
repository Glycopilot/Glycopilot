"""Views for notifications app."""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import PushToken
from .serializers import PushTokenSerializer


class PushTokenView(APIView):
    """
    Manage push tokens for the authenticated user.

    POST: Register a new push token
    DELETE: Unregister a push token
    GET: List user's push tokens
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """List all push tokens for the current user."""
        tokens = PushToken.objects.filter(user=request.user, is_active=True)
        serializer = PushTokenSerializer(tokens, many=True)
        return Response(serializer.data)

    def post(self, request):
        """Register a new push token."""
        serializer = PushTokenSerializer(
            data=request.data,
            context={"request": request},
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        """Unregister a push token."""
        token = request.data.get("token")
        if not token:
            return Response(
                {"error": "Token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = PushToken.objects.filter(
            user=request.user,
            token=token,
        ).delete()

        if deleted:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(
            {"error": "Token not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
