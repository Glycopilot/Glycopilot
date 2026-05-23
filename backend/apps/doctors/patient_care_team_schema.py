def _column_exists(connection, table, column):
    with connection.cursor() as cursor:
        if connection.vendor == "sqlite":
            cursor.execute(f"PRAGMA table_info({table})")
            return any(row[1] == column for row in cursor.fetchall())
        if connection.vendor == "mysql":
            cursor.execute(
                """
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = DATABASE()
                  AND table_name = %s AND column_name = %s
                """,
                [table, column],
            )
            return cursor.fetchone()[0] > 0
        cursor.execute(
            """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
            """,
            [table, column],
        )
        return cursor.fetchone()[0] > 0


def _add_column(connection, table, column, mysql_ddl, sqlite_ddl):
    if _column_exists(connection, table, column):
        return
    ddl = mysql_ddl if connection.vendor == "mysql" else sqlite_ddl
    with connection.cursor() as cursor:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")
        except Exception:
            if not _column_exists(connection, table, column):
                raise


def sync_patient_care_team_columns(apps, schema_editor):
    table = "patient_care_team"
    connection = schema_editor.connection
    for name, mysql_ddl, sqlite_ddl in (
        ("activation_code", "activation_code VARCHAR(6) NULL", "activation_code varchar(6)"),
        ("rejection_reason", "rejection_reason LONGTEXT NULL", "rejection_reason text"),
        ("relation_type", "relation_type VARCHAR(100) NULL", "relation_type varchar(100)"),
        ("created_at", "created_at DATETIME(6) NULL", "created_at datetime"),
        ("updated_at", "updated_at DATETIME(6) NULL", "updated_at datetime"),
        ("approved_by_id", "approved_by_id CHAR(32) NULL", "approved_by_id char(32)"),
    ):
        _add_column(connection, table, name, mysql_ddl, sqlite_ddl)
