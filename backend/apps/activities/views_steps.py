from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserMilestonePoints, UserStepDayCheckpoint
from .services.step_milestones import process_daily_steps_sync
from .step_serializers import DailyStepsSyncSerializer


class DailyStepsStateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        ck = (
            UserStepDayCheckpoint.objects.filter(user=request.user, day=today)
            .values_list("last_reported_steps", flat=True)
            .first()
        )
        steps_today = ck or 0
        total_pts = (
            UserMilestonePoints.objects.filter(user=request.user)
            .values_list("total_points", flat=True)
            .first()
        )
        total_pts = total_pts or 0
        return Response(
            {
                "day": today.isoformat(),
                "reported_steps_today": steps_today,
                "total_milestone_points": total_pts,
                "step_block": 100,
                "points_per_block": 5,
            }
        )


class DailyStepsSyncAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = DailyStepsSyncSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        day = ser.validated_data.get("day") or timezone.now().date()
        steps = ser.validated_data["steps"]
        result = process_daily_steps_sync(request.user, day, steps)
        return Response(
            {
                "steps": result.steps,
                "day": result.day,
                "points_earned": result.points_earned,
                "milestones_crossed": result.milestones_crossed,
                "total_milestone_points": result.total_milestone_points,
            },
            status=status.HTTP_200_OK,
        )
