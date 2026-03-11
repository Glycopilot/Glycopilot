"""
Simule un capteur CGM (Continuous Glucose Monitor) pour les tests.

Génère des lectures de glycémie réalistes à intervalle régulier pour
un ou tous les patients, en attendant l'intégration des vrais capteurs.

Usage:
    # Simuler pour tous les patients (toutes les 5 min)
    python manage.py simulate_cgm

    # Simuler pour un patient spécifique
    python manage.py simulate_cgm --email patient@example.com

    # Injecter une seule lecture et quitter (utile pour les tests)
    python manage.py simulate_cgm --once

    # Changer l'intervalle (en secondes)
    python manage.py simulate_cgm --interval 60
"""

import random
import time
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils.timezone import now


# Plages normales et contextes selon l'heure de la journée
# (heure, valeur_base, contexte)
_HOURLY_PROFILE = [
    (0,  90,  "bedtime"),
    (1,  85,  "bedtime"),
    (2,  82,  "fasting"),
    (3,  80,  "fasting"),
    (4,  82,  "fasting"),
    (5,  85,  "fasting"),
    (6,  88,  "fasting"),
    (7,  95,  "preprandial"),       # petit-déjeuner
    (8,  145, "postprandial_1h"),
    (9,  120, "postprandial_2h"),
    (10, 105, "preprandial"),
    (11, 100, "preprandial"),
    (12, 98,  "preprandial"),       # déjeuner
    (13, 150, "postprandial_1h"),
    (14, 125, "postprandial_2h"),
    (15, 110, "preprandial"),
    (16, 108, "exercise"),
    (17, 100, "exercise"),
    (18, 105, "preprandial"),       # dîner
    (19, 155, "postprandial_1h"),
    (20, 130, "postprandial_2h"),
    (21, 115, "bedtime"),
    (22, 100, "bedtime"),
    (23, 95,  "bedtime"),
]


def _base_value_for_hour(hour: int) -> tuple[float, str]:
    """Retourne la valeur de base et le contexte pour une heure donnée."""
    for h, val, ctx in reversed(_HOURLY_PROFILE):
        if hour >= h:
            return float(val), ctx
    return 90.0, "fasting"


def _compute_trend(previous: float | None, current: float) -> str:
    """Calcule la tendance selon la variation depuis la dernière lecture."""
    if previous is None:
        return "flat"
    delta = current - previous
    if delta > 5:
        return "rising"
    if delta < -5:
        return "falling"
    return "flat"


def _compute_rate(previous: float | None, current: float, interval_seconds: int) -> float | None:
    """Calcule le taux de variation en mg/dL par minute."""
    if previous is None:
        return None
    delta = current - previous
    minutes = interval_seconds / 60
    return round(delta / minutes, 2)


def _generate_value(previous: float | None) -> float:
    """
    Génère une valeur réaliste en appliquant une marche aléatoire gaussienne
    sur la valeur précédente, recadrée sur le profil horaire courant.
    """
    base, _ = _base_value_for_hour(now().hour)

    if previous is None:
        # Première lecture : partir de la valeur de base ± bruit
        value = base + random.gauss(0, 8)  # NOSONAR
    else:
        # Marche aléatoire douce avec rappel vers la valeur de base
        noise = random.gauss(0, 4)          # NOSONAR – variation locale
        revert = (base - previous) * 0.05   # rappel progressif vers la base
        value = previous + noise + revert

    # Borner entre 55 et 300 mg/dL (plage physiologique)
    return round(max(55.0, min(300.0, value)), 1)


def _inject_reading(user, previous: float | None, interval_seconds: int) -> float:
    """
    Insère une lecture CGM simulée pour un user.
    Écrit dans GlycemiaHisto ET Glycemia (même logique que manual_readings).
    Le signal Django broadcast ensuite via WebSocket automatiquement.
    """
    from apps.glycemia.models import Glycemia, GlycemiaHisto

    value = _generate_value(previous)
    _, context = _base_value_for_hour(now().hour)
    trend = _compute_trend(previous, value)
    rate = _compute_rate(previous, value, interval_seconds)
    measured_at = now()

    # Historique complet (déclenche le signal WebSocket)
    histo = GlycemiaHisto.objects.create(
        user=user,
        measured_at=measured_at,
        value=value,
        unit="mg/dL",
        trend=trend,
        rate=rate,
        source="cgm",
        context=context,
        notes="[simulation CGM]",
    )

    # Cache 30 jours
    Glycemia.objects.create(
        user=user,
        measured_at=measured_at,
        value=value,
        unit="mg/dL",
        trend=trend,
        rate=rate,
        source="cgm",
        context=context,
        notes="[simulation CGM]",
    )

    # Nettoyer les entrées Glycemia > 30 jours
    cutoff = now() - timedelta(days=30)
    Glycemia.objects.filter(user=user, measured_at__lt=cutoff).delete()

    return value


def _get_last_value(user) -> float | None:
    """Récupère la dernière valeur connue pour un user."""
    from apps.glycemia.models import GlycemiaHisto
    last = GlycemiaHisto.objects.filter(user=user).order_by("-measured_at").first()
    return float(last.value) if last else None


class Command(BaseCommand):
    help = "Simule un capteur CGM en générant des lectures périodiques"

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            type=str,
            default=None,
            help="Email du patient à simuler (défaut : tous les patients actifs)",
        )
        parser.add_argument(
            "--interval",
            type=int,
            default=300,
            help="Intervalle entre les lectures en secondes (défaut : 300 = 5 min)",
        )
        parser.add_argument(
            "--once",
            action="store_true",
            help="Injecter une seule lecture puis quitter",
        )

    def handle(self, *args, **options):
        from apps.users.models import AuthAccount

        email = options["email"]
        interval = options["interval"]
        once = options["once"]

        # Récupérer les utilisateurs cibles
        qs = AuthAccount.objects.filter(is_active=True)
        if email:
            qs = qs.filter(email=email)
            if not qs.exists():
                self.stderr.write(self.style.ERROR(f"Aucun utilisateur trouvé : {email}"))
                return

        users = list(qs)

        if not users:
            self.stderr.write(self.style.WARNING("Aucun patient actif trouvé."))
            return

        emails = ", ".join(u.email for u in users)
        self.stdout.write(self.style.SUCCESS(
            f"Simulation CGM démarrée pour : {emails}"
        ))
        if not once:
            self.stdout.write(f"Intervalle : {interval}s  |  Ctrl+C pour arrêter\n")

        # État précédent par user
        previous_values: dict[int, float | None] = {
            u.pk: _get_last_value(u) for u in users
        }

        while True:
            for user in users:
                prev = previous_values.get(user.pk)
                value = _inject_reading(user, prev, interval)
                previous_values[user.pk] = value

                trend_arrow = {"rising": "↑", "falling": "↓", "flat": "→"}.get(
                    _compute_trend(prev, value), "→"
                )
                self.stdout.write(
                    f"[{now().strftime('%H:%M:%S')}] {user.email} — "
                    f"{value} mg/dL {trend_arrow}"
                )

            if once:
                break

            time.sleep(interval)
