from django.db import migrations


def get_existing_columns(schema_editor, table_name):
    return {
        column.name
        for column in schema_editor.connection.introspection.get_table_description(
            schema_editor.connection.cursor(),
            table_name,
        )
    }


def add_missing_fields(schema_editor, model, table_name, field_names):
    existing_columns = get_existing_columns(schema_editor, table_name)
    for field_name in field_names:
        field = model._meta.get_field(field_name)
        if field.column not in existing_columns:
            schema_editor.add_field(model, field)
            existing_columns.add(field.column)


def add_usermeal_fields_if_missing(apps, schema_editor):
    UserMeal = apps.get_model("meals", "UserMeal")
    add_missing_fields(
        schema_editor,
        UserMeal,
        "users_meals",
        [
            "portion_g",
            "notes",
            "input_mode",
            "session_key",
        ],
    )


class Migration(migrations.Migration):
    dependencies = [
        ("meals", "0003_reconcile_usermeal_meal_type"),
    ]

    operations = [
        migrations.RunPython(add_usermeal_fields_if_missing, migrations.RunPython.noop),
    ]
