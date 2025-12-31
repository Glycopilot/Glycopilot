import csv
from pathlib import Path
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.medications.models import Medication

class Command(BaseCommand):
    help = 'Imports medications from CSV file'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("Starting medications import..."))
        
        data_dir = settings.BASE_DIR / 'data' / 'import'
        file_path = data_dir / 'medications.csv'
        
        self.import_medications(file_path)

    def import_medications(self, path: Path):
        if not path.exists():
            self.stdout.write(self.style.WARNING(f"File not found: {path}"))
            return

        with open(path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            count_created = 0
            count_updated = 0
            
            for row in reader:
                try:
                    medication_id = int(row['id'])
                    interval_h = int(row['interval_h']) if row.get('interval_h') else None
                    max_duration_d = int(row['max_duration_d']) if row.get('max_duration_d') else None
                    
                    obj, created = Medication.objects.update_or_create(
                        medication_id=medication_id,
                        defaults={
                            'name': row['name'],
                            'type': row.get('type'),
                            'dosage': row.get('dosage'),
                            'interval_h': interval_h,
                            'max_duration_d': max_duration_d,
                        }
                    )
                    
                    if created:
                        count_created += 1
                    else:
                        count_updated += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing medication ID {row.get('id')}: {e}"))
            
            self.stdout.write(self.style.SUCCESS(f"Medications: {count_created} created, {count_updated} updated."))
