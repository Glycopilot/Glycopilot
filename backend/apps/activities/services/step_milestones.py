"""
Logique type « steps tracker » : paliers de pas sur la journée → points bonus.
Inspiré du principe every N steps → points (ex. 100 pas → 5 points), calculé côté serveur.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

STEP_BLOCK = 100
POINTS_PER_BLOCK = 5


@dataclass
class StepSyncResult:
    steps: int
    day: str
    points_earned: int
    milestones_crossed: int
    total_milestone_points: int


def process_daily_steps_sync(user, day: date, steps: int) -> StepSyncResult:
    from ..models import UserMilestonePoints, UserStepDayCheckpoint

    steps = max(0, int(steps))

    checkpoint, _ = UserStepDayCheckpoint.objects.get_or_create(
        user=user,
        day=day,
        defaults={"last_reported_steps": 0},
    )
    stats, _ = UserMilestonePoints.objects.get_or_create(
        user=user,
        defaults={"total_points": 0},
    )

    old = checkpoint.last_reported_steps

    if steps < old:
        checkpoint.last_reported_steps = steps
        checkpoint.save(update_fields=["last_reported_steps"])
        return StepSyncResult(
            steps=steps,
            day=day.isoformat(),
            points_earned=0,
            milestones_crossed=0,
            total_milestone_points=stats.total_points,
        )

    prev_blocks = old // STEP_BLOCK
    new_blocks = steps // STEP_BLOCK
    crossed = max(0, new_blocks - prev_blocks)
    points_earned = crossed * POINTS_PER_BLOCK

    if points_earned:
        stats.total_points += points_earned
        stats.save(update_fields=["total_points"])

    checkpoint.last_reported_steps = steps
    checkpoint.save(update_fields=["last_reported_steps"])

    return StepSyncResult(
        steps=steps,
        day=day.isoformat(),
        points_earned=points_earned,
        milestones_crossed=crossed,
        total_milestone_points=stats.total_points,
    )
