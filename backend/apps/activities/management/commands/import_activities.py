import csv
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.activities.models import Activity


class Command(BaseCommand):
    help = "Imports activities from CSV file"

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Starting activities import..."))

        data_dir = settings.BASE_DIR / "data" / "import"
        file_path = data_dir / "activities.csv"

        self.import_activities(file_path)

    def import_activities(self, path: Path):
        if not path.exists():
            self.stdout.write(self.style.WARNING(f"File not found: {path}"))
            return

        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count_created = 0
            count_updated = 0

            for row in reader:
                try:
                    activity_id = int(row["id"])
                    recommended_duration = (
                        int(row["recommended_duration"])
                        if row.get("recommended_duration")
                        else None
                    )
                    calories_burned = (
                        int(row["calories_burned"])
                        if row.get("calories_burned")
                        else None
                    )
                    sugar_used = (
                        float(row["sugar_used"]) if row.get("sugar_used") else None
                    )

                    obj, created = Activity.objects.update_or_create(
                        activity_id=activity_id,
                        defaults={
                            "name": row["name"],
                            "recommended_duration": recommended_duration,
                            "calories_burned": calories_burned,
                            "sugar_used": sugar_used,
                        },
                    )

                    if created:
                        count_created += 1
                    else:
                        count_updated += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error processing activity ID {row.get('id')}: {e}"
                        )
                    )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Activities: {count_created} created, {count_updated} updated."
                )
            )
