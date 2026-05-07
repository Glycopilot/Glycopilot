import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("glycemia", "0002_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PersonalModelApproval",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("patient_id", models.CharField(db_index=True, help_text="UUID du patient dans l'AI service", max_length=64)),
                ("version", models.CharField(default="v1.0", max_length=20)),
                ("status", models.CharField(
                    choices=[("pending", "En attente"), ("approved", "Approuvé"), ("rejected", "Rejeté")],
                    db_index=True,
                    default="pending",
                    max_length=20,
                )),
                ("mae_15", models.FloatField(blank=True, help_text="MAE @15 min (mg/dL)", null=True)),
                ("mae_30", models.FloatField(blank=True, help_text="MAE @30 min (mg/dL)", null=True)),
                ("mae_60", models.FloatField(blank=True, help_text="MAE @60 min (mg/dL)", null=True)),
                ("trained_at", models.DateTimeField(auto_now_add=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("approved_by", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="approved_personal_models",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "verbose_name": "Modèle personnel",
                "verbose_name_plural": "Modèles personnels (validation)",
                "ordering": ["-trained_at"],
            },
        ),
    ]
