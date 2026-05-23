from importlib import import_module

from django.db import connection
from django.test import TestCase

from apps.doctors.patient_care_team_schema import sync_patient_care_team_columns


class PatientCareTeamMigrationTests(TestCase):
    def test_0007_migration_has_no_duplicate_operations(self):
        migration = import_module(
            "apps.doctors.migrations.0007_patient_care_team_sync_columns"
        ).Migration
        self.assertEqual(migration.operations, [])

    def test_0006_runs_column_sync_once(self):
        migration = import_module(
            "apps.doctors.migrations.0006_patientcareteam_activation_code"
        ).Migration
        self.assertEqual(len(migration.operations), 1)
        self.assertEqual(
            migration.operations[0].__class__.__name__,
            "RunPython",
        )

    def test_sync_patient_care_team_columns_is_idempotent(self):
        from django.apps import apps

        schema_editor = connection.schema_editor()

        sync_patient_care_team_columns(apps, schema_editor)
        sync_patient_care_team_columns(apps, schema_editor)

        with connection.cursor() as cursor:
            if connection.vendor == "sqlite":
                cursor.execute("PRAGMA table_info(patient_care_team)")
                columns = {row[1] for row in cursor.fetchall()}
            else:
                cursor.execute(
                    """
                    SELECT column_name FROM information_schema.columns
                    WHERE table_schema = DATABASE() AND table_name = 'patient_care_team'
                    """
                )
                columns = {row[0] for row in cursor.fetchall()}

        for col in (
            "activation_code",
            "rejection_reason",
            "relation_type",
            "created_at",
            "updated_at",
            "approved_by_id",
        ):
            self.assertIn(col, columns)
