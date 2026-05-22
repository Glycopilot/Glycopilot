from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("doctors", "0004_doctorprofile_medical_center_postal_code"),
    ]

    operations = [
        migrations.AddField(
            model_name="doctorprofile",
            name="medical_center_city",
            field=models.CharField(
                blank=True,
                max_length=120,
                null=True,
                verbose_name="Ville du centre médical",
            ),
        ),
    ]
