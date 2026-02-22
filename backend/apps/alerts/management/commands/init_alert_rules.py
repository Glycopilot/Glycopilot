from django.core.management.base import BaseCommand

from apps.alerts.models import AlertRule, AlertSeverity

RULES = [
    {
        "code": "HYPO",
        "name": "Hypoglycémie",
        "description": "Glycémie inférieure à 70 mg/dL",
        "max_glycemia": 69,
        "min_glycemia": None,
        "severity": AlertSeverity.CRITICAL,
    },
    {
        "code": "HYPER",
        "name": "Hyperglycémie",
        "description": "Glycémie supérieure à 180 mg/dL",
        "min_glycemia": 181,
        "max_glycemia": None,
        "severity": AlertSeverity.HIGH,
    },
]


class Command(BaseCommand):
    help = "Create or update the default HYPO/HYPER alert rules"

    def handle(self, *args, **options):
        for rule_data in RULES:
            code = rule_data.pop("code")
            obj, created = AlertRule.objects.update_or_create(
                code=code,
                defaults=rule_data,
            )
            verb = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"{verb} rule: {obj}"))
