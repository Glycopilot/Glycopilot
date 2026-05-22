from django.db import migrations

from apps.meals.meals_db_schema import sync_meals_columns, sync_users_meals_columns


class Migration(migrations.Migration):
    dependencies = [
        ("meals", "0002_initial"),
    ]

    operations = [
        migrations.RunPython(sync_users_meals_columns, migrations.RunPython.noop),
        migrations.RunPython(sync_meals_columns, migrations.RunPython.noop),
    ]
