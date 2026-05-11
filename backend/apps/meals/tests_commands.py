import csv
import tempfile
from io import StringIO
from pathlib import Path

import pytest

from apps.meals.models import Meal


@pytest.mark.django_db
def test_import_meals_success(settings):
    """Test importing meals from a CSV file successfully."""
    data_dir = Path(settings.BASE_DIR) / "data" / "import"
    data_dir.mkdir(parents=True, exist_ok=True)
    file_path = data_dir / "meals.csv"

    with open(file_path, "w", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["id", "name", "ingredients", "recipe", "glucose", "calories"]
        )
        writer.writeheader()
        writer.writerow(
            {
                "id": "1",
                "name": "Pasta",
                "ingredients": "Flour, Eggs",
                "recipe": "Boil water...",
                "glucose": "5.5",
                "calories": "350",
            }
        )

    try:
        from django.core.management import call_command

        out = StringIO()
        call_command("import_meals", stdout=out)

        assert Meal.objects.count() == 1
        pasta = Meal.objects.get(meal_id=1)
        assert pasta.name == "Pasta"
        assert "Meals: 1 created, 0 updated" in out.getvalue()

    finally:
        if file_path.exists():
            file_path.unlink()


@pytest.mark.django_db
def test_import_meals_file_not_found():
    """Test importing when file does not exist."""
    from apps.meals.management.commands.import_meals import Command

    out = StringIO()
    cmd = Command(stdout=out)
    cmd.import_meals(Path("/non/existent/meals.csv"))

    assert "File not found" in out.getvalue()
    assert Meal.objects.count() == 0


@pytest.mark.django_db
def test_import_meals_error_processing():
    """Test handling of invalid rows."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tf:
        tf.write("id,name,glucose\n")
        tf.write("invalid,Pasta,5.5\n")
        temp_file_path = tf.name

    try:
        from apps.meals.management.commands.import_meals import Command

        out = StringIO()
        cmd = Command(stdout=out)
        cmd.import_meals(Path(temp_file_path))

        assert "Error processing meal ID" in out.getvalue()
        assert Meal.objects.count() == 0
    finally:
        Path(temp_file_path).unlink()
