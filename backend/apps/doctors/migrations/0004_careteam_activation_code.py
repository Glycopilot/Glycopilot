from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("doctors", "0003_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientcareteam",
            name="activation_code",
            field=models.CharField(
                blank=True,
                max_length=6,
                null=True,
                verbose_name="Activation Code (6 chars, proche only)",
            ),
        ),
    ]
