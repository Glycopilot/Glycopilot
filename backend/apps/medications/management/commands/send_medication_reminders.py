from django.core.management.base import BaseCommand

from apps.medications.services.reminders import send_due_medication_reminders


class Command(BaseCommand):
    help = "Envoie les notifications push pour les prises de médicaments dues"

    def handle(self, *args, **kwargs):
        stats = send_due_medication_reminders()
        self.stdout.write(
            self.style.SUCCESS(
                f"Rappels envoyés: {stats['sent']} | skippés: {stats['skipped']} | erreurs: {stats['errors']}"
            )
        )
