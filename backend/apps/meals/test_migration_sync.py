from django.apps import apps
from django.db import connection
from django.test import TestCase

from apps.meals.meals_db_schema import sync_meals_columns, sync_users_meals_columns


class MealsMigrationSyncTests(TestCase):
    def test_sync_users_meals_columns_is_idempotent(self):
        schema_editor = connection.schema_editor()
        sync_users_meals_columns(apps, schema_editor)
        sync_users_meals_columns(apps, schema_editor)

        with connection.cursor() as cursor:
            if connection.vendor == "sqlite":
                cursor.execute("PRAGMA table_info(users_meals)")
                columns = {row[1] for row in cursor.fetchall()}
            else:
                cursor.execute(
                    """
                    SELECT column_name FROM information_schema.columns
                    WHERE table_schema = DATABASE() AND table_name = 'users_meals'
                    """
                )
                columns = {row[0] for row in cursor.fetchall()}

        for col in ("meal_type", "portion_g", "notes", "input_mode", "session_key"):
            self.assertIn(col, columns)

    def test_sync_meals_columns_is_idempotent(self):
        schema_editor = connection.schema_editor()
        sync_meals_columns(apps, schema_editor)
        sync_meals_columns(apps, schema_editor)

        with connection.cursor() as cursor:
            if connection.vendor == "sqlite":
                cursor.execute("PRAGMA table_info(meals)")
                columns = {row[1] for row in cursor.fetchall()}
            else:
                cursor.execute(
                    """
                    SELECT column_name FROM information_schema.columns
                    WHERE table_schema = DATABASE() AND table_name = 'meals'
                    """
                )
                columns = {row[0] for row in cursor.fetchall()}

        for col in ("glucides", "proteines", "lipides", "barcode", "source"):
            self.assertIn(col, columns)
