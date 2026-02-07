import csv
import tempfile
from pathlib import Path

from django.test import TestCase

from apps.meals.management.commands.import_meals import Command as MealsCommand
from apps.medications.management.commands.import_medications import (
    Command as MedicationsCommand,
)


class ManagementCommandsCoverageTests(TestCase):
    def test_import_meals(self):
        cmd = MealsCommand()
        missing_path = Path("/tmp/missing_meals.csv")
        cmd.import_meals(missing_path)
        cmd.handle()

        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "meals.csv"
            with open(path, "w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(
                    f, fieldnames=["id", "name", "ingredients", "recipe", "glucose", "calories"]
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "id": "1",
                        "name": "Meal A",
                        "ingredients": "x",
                        "recipe": "y",
                        "glucose": "20",
                        "calories": "200",
                    }
                )
                writer.writerow({"id": "bad", "name": "Bad"})
            cmd.import_meals(path)

    def test_import_medications(self):
        cmd = MedicationsCommand()
        missing_path = Path("/tmp/missing_meds.csv")
        cmd.import_medications(missing_path)
        cmd.handle()

        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "meds.csv"
            with open(path, "w", encoding="utf-8", newline="") as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=[
                        "id",
                        "name",
                        "type",
                        "dosage",
                        "interval_h",
                        "max_duration_d",
                    ],
                )
                writer.writeheader()
                writer.writerow(
                    {
                        "id": "1",
                        "name": "Med A",
                        "type": "tablet",
                        "dosage": "10mg",
                        "interval_h": "8",
                        "max_duration_d": "14",
                    }
                )
                writer.writerow({"id": "bad", "name": "Bad"})
            cmd.import_medications(path)
