from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("models", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[("patient", "Patient"), ("doctor", "Doctor"), ("admin", "Admin")],
                default="patient",
                max_length=20,
            ),
        ),
    ]

