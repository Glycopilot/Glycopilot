import csv
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.meals.models import Meal


class Command(BaseCommand):
    help = "Imports meals from CSV file"

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Starting meals import..."))

        data_dir = settings.BASE_DIR / "data" / "import"
        file_path = data_dir / "meals.csv"

        self.import_meals(file_path)

    def import_meals(self, path: Path):
        if not path.exists():
            self.stdout.write(self.style.WARNING(f"File not found: {path}"))
            return

        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            count_created = 0
            count_updated = 0

            for row in reader:
                try:
                    meal_id = int(row["id"])
                    glucose = float(row["glucose"]) if row.get("glucose") else None
                    calories = int(row["calories"]) if row.get("calories") else None

                    obj, created = Meal.objects.update_or_create(
                        meal_id=meal_id,
                        defaults={
                            "name": row["name"],
                            "ingredients": row.get("ingredients"),
                            "recipe": row.get("recipe"),
                            "glucose": glucose,
                            "calories": calories,
                        },
                    )

                    if created:
                        count_created += 1
                    else:
                        count_updated += 1
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error processing meal ID {row.get('id')}: {e}"
                        )
                    )

            self.stdout.write(
                self.style.SUCCESS(
                    f"Meals: {count_created} created, {count_updated} updated."
                )
            )
