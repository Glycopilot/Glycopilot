import csv
import tempfile
from io import StringIO
from pathlib import Path

from django.conf import settings
from django.core.management import call_command

import pytest

from apps.activities.models import Activity


@pytest.mark.django_db
def test_import_activities_success():
    """Test importing activities from a CSV file successfully."""
    # Create a temporary CSV file in the expected location if possible, or just mock it
    # For 100% coverage, we should test call_command which calls handle()
    data_dir = Path(settings.BASE_DIR) / "data" / "import"
    data_dir.mkdir(parents=True, exist_ok=True)
    file_path = data_dir / "activities.csv"

    with open(file_path, "w", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name",
                "recommended_duration",
                "calories_burned",
                "sugar_used",
            ],
        )
        writer.writeheader()
        writer.writerow(
            {
                "id": "1",
                "name": "Walking",
                "recommended_duration": "30",
                "calories_burned": "100",
                "sugar_used": "10.5",
            }
        )

    try:
        out = StringIO()
        call_command("import_activities", stdout=out)

        assert Activity.objects.count() == 1
        walking = Activity.objects.get(activity_id=1)
        assert walking.name == "Walking"
        assert "Activities: 1 created, 0 updated" in out.getvalue()

    finally:
        if file_path.exists():
            file_path.unlink()


@pytest.mark.django_db
def test_import_activities_file_not_found():
    """Test importing when file does not exist."""
    from apps.activities.management.commands.import_activities import Command

    out = StringIO()
    cmd = Command(stdout=out)
    cmd.import_activities(Path("/non/existent/path.csv"))

    assert "File not found" in out.getvalue()
    assert Activity.objects.count() == 0


@pytest.mark.django_db
def test_import_activities_error_processing():
    """Test handling of invalid rows."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tf:
        tf.write("id,name,recommended_duration\n")
        tf.write("invalid,Walking,30\n")
        temp_file_path = tf.name

    try:
        from apps.activities.management.commands.import_activities import Command

        out = StringIO()
        cmd = Command(stdout=out)
        cmd.import_activities(Path(temp_file_path))

        assert "Error processing activity ID" in out.getvalue()
        assert Activity.objects.count() == 0
    finally:
        Path(temp_file_path).unlink()
