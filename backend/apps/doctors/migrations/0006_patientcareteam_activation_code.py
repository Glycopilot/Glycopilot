from django.db import migrations

from apps.doctors.patient_care_team_schema import sync_patient_care_team_columns


class Migration(migrations.Migration):

    dependencies = [
        ("doctors", "0005_doctorprofile_medical_center_city"),
    ]

    operations = [
        migrations.RunPython(sync_patient_care_team_columns, migrations.RunPython.noop),
    ]
