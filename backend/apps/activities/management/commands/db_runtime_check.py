from django.core.management.base import BaseCommand
from django.db import connection

from apps.glycemia.models import Glycemia
from apps.medications.models import Medication
from apps.users.models import AuthAccount


class Command(BaseCommand):
    help = "Print sanitized runtime database information and critical row counts."

    def handle(self, *args, **options):
        settings = connection.settings_dict

        with connection.cursor() as cursor:
            cursor.execute("select version()")
            db_version = cursor.fetchone()[0]

        self.stdout.write(f"engine={settings.get('ENGINE')}")
        self.stdout.write(f"host={settings.get('HOST')}")
        self.stdout.write(f"port={settings.get('PORT')}")
        self.stdout.write(f"name={settings.get('NAME')}")
        self.stdout.write(f"user={settings.get('USER')}")
        self.stdout.write(f"sslmode={settings.get('OPTIONS', {}).get('sslmode', '')}")
        self.stdout.write(f"version={db_version}")
        self.stdout.write(f"auth_accounts={AuthAccount.objects.count()}")
        self.stdout.write(f"glycemia={Glycemia.objects.count()}")
        self.stdout.write(f"medications={Medication.objects.count()}")
