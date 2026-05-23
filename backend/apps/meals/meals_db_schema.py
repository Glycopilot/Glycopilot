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


def sync_users_meals_columns(apps, schema_editor):
    table = "users_meals"
    connection = schema_editor.connection
    for name, mysql_ddl, sqlite_ddl in (
        ("meal_type", "meal_type VARCHAR(15) NOT NULL DEFAULT 'lunch'", "meal_type varchar(15) NOT NULL DEFAULT 'lunch'"),
        ("portion_g", "portion_g DOUBLE NULL", "portion_g real"),
        ("notes", "notes LONGTEXT NULL", "notes text"),
        ("input_mode", "input_mode VARCHAR(10) NOT NULL DEFAULT 'manual'", "input_mode varchar(10) NOT NULL DEFAULT 'manual'"),
        ("session_key", "session_key VARCHAR(40) NULL", "session_key varchar(40)"),
    ):
        _add_column(connection, table, name, mysql_ddl, sqlite_ddl)


def sync_meals_columns(apps, schema_editor):
    table = "meals"
    connection = schema_editor.connection
    for name, mysql_ddl, sqlite_ddl in (
        ("glucides", "glucides DOUBLE NULL", "glucides real"),
        ("proteines", "proteines DOUBLE NULL", "proteines real"),
        ("lipides", "lipides DOUBLE NULL", "lipides real"),
        ("barcode", "barcode VARCHAR(30) NULL", "barcode varchar(30)"),
        ("source", "source VARCHAR(10) NOT NULL DEFAULT 'manual'", "source varchar(10) NOT NULL DEFAULT 'manual'"),
    ):
        _add_column(connection, table, name, mysql_ddl, sqlite_ddl)
