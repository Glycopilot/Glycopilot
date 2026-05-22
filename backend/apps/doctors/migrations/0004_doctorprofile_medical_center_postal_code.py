from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("doctors", "0003_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="doctorprofile",
            name="medical_center_postal_code",
            field=models.CharField(
                blank=True,
                max_length=10,
                null=True,
                verbose_name="Code postal du Cabinet / Hôpital",
            ),
        ),
    ]
