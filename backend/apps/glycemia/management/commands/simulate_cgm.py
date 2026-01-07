import time
import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.users.models import User
from apps.glycemia.models import Glycemia, GlycemiaHisto
import uuid

class Command(BaseCommand):
    help = 'Simule un capteur CGM qui génère des données toutes les X minutes'

    def add_arguments(self, parser):
        parser.add_argument(
            'email',
            type=str,
            help="Email de l'utilisateur pour lequel simuler le CGM"
        )
        parser.add_argument(
            '--interval',
            type=float,
            default=5.0,
            help='Intervalle en minutes entre chaque mesure (défaut: 5)'
        )
        parser.add_argument(
            '--duration',
            type=int,
            default=0,
            help='Durée totale de simulation en minutes (0 = infini)'
        )
        parser.add_argument(
            '--base-value',
            type=float,
            default=120.0,
            help='Valeur de base autour de laquelle osciller (défaut: 120 mg/dL)'
        )
        parser.add_argument(
            '--fast-mode',
            action='store_true',
            help='Mode rapide pour dev/demo: réduit l\'intervalle et les variations proportionnellement'
        )

    def handle(self, *args, **options):
        email = options['email']
        interval_minutes = options['interval']
        duration_minutes = options['duration']
        base_value = options['base_value']
        fast_mode = options['fast_mode']

        if fast_mode:
            self.stdout.write(self.style.WARNING("🚀 Fast mode activé ! Intervalle et delta adaptés pour dev/demo"))
            # Si l'intervalle n’est pas trop petit, le réduire à 1 min
            if interval_minutes > 1:
                interval_minutes = 1

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Utilisateur {email} introuvable'))
            return

        self.stdout.write(self.style.SUCCESS(f'🔄 Démarrage simulation CGM pour {user.email}'))
        self.stdout.write(self.style.SUCCESS(f'📊 Mesure toutes les {interval_minutes} minute(s)'))
        if duration_minutes > 0:
            self.stdout.write(self.style.SUCCESS(f'⏱️  Durée: {duration_minutes} minutes'))
        else:
            self.stdout.write(self.style.WARNING('⏱️  Durée: infinie (Ctrl+C pour arrêter)'))

        start_time = time.time()
        measurement_count = 0
        current_value = base_value

        trend_direction = random.choice(['stable', 'rising', 'falling'])
        trend_counter = 0
        trend_duration = random.randint(3, 8)

        try:
            while True:
                # Vérifier la durée max
                if duration_minutes > 0:
                    elapsed_minutes = (time.time() - start_time) / 60
                    if elapsed_minutes >= duration_minutes:
                        self.stdout.write(self.style.SUCCESS(f'\n✅ Simulation terminée après {duration_minutes} minutes'))
                        break

                # Générer valeur réaliste
                current_value = self._generate_realistic_value(
                    current_value,
                    trend_direction,
                    base_value,
                    interval_minutes,
                    fast_mode
                )

                trend_counter += 1
                if trend_counter >= trend_duration:
                    trend_direction = self._get_next_trend(trend_direction)
                    trend_counter = 0
                    trend_duration = random.randint(3, 8)

                # Déterminer trend et rate
                if trend_direction == 'rising':
                    trend = 'rising'
                    rate = random.uniform(1.0, 3.0)
                elif trend_direction == 'falling':
                    trend = 'falling'
                    rate = random.uniform(-3.0, -1.0)
                else:
                    trend = 'stable'
                    rate = random.uniform(-0.5, 0.5)

                now = timezone.now()
                reading_id = str(uuid.uuid4())

                # Mettre à jour Glycemia
                Glycemia.objects.update_or_create(
                    user=user,
                    defaults={
                        'measured_at': now,
                        'value': round(current_value, 1),
                        'unit': 'mg/dL',
                        'trend': trend,
                        'rate': round(rate, 2),
                        'source': 'cgm',
                    }
                )

                # Ajouter GlycemiaHisto
                GlycemiaHisto.objects.create(
                    reading_id=reading_id,
                    user=user,
                    measured_at=now,
                    value=round(current_value, 1),
                    unit='mg/dL',
                    trend=trend,
                    rate=round(rate, 2),
                    source='cgm',
                )

                measurement_count += 1

                trend_arrow = {'rising':'↗️','falling':'↘️','stable':'→'}.get(trend,'→')
                self.stdout.write(f'[{now.strftime("%H:%M:%S")}] Mesure #{measurement_count}: {current_value:.1f} mg/dL {trend_arrow} (rate: {rate:+.1f})')

                # Attendre le prochain intervalle
                time.sleep(interval_minutes * 60)

        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING(f'\n⚠️ Simulation interrompue après {measurement_count} mesures'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Erreur: {str(e)}'))

    def _generate_realistic_value(self, current, trend, base, interval_minutes, fast_mode):
        """Génère une valeur réaliste basée sur la tendance"""
        # Delta de base
        if trend == 'rising':
            delta = random.uniform(1.0, 4.0)
        elif trend == 'falling':
            delta = random.uniform(-4.0, -1.0)
        else:
            delta = random.uniform(-1.5, 1.5)

        # Ajustement pour fast-mode et intervalle court
        if fast_mode:
            scale = max(interval_minutes / 5.0, 0.1)
            delta *= scale

        new_value = current + delta

        # Limites de sécurité
        new_value = max(60, min(250, new_value))

        # Correction vers la base si trop éloigné
        if abs(new_value - base) > 40:
            correction = (base - new_value) * 0.1
            new_value += correction

        return new_value

    def _get_next_trend(self, current_trend):
        """Prochaine tendance réaliste"""
        if current_trend == 'rising':
            return random.choice(['stable', 'stable', 'falling'])
        elif current_trend == 'falling':
            return random.choice(['stable', 'stable', 'rising'])
        else:
            return random.choice(['stable', 'rising', 'falling'])
