"""
Script pour afficher les données d'un utilisateur du dashboard.

Usage:
    python manage.py show_user_data <email>
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from apps.glycemia.models import Glycemia, GlycemiaHisto
from apps.alerts.models import UserAlert
from apps.medications.models import UserMedication
from apps.meals.models import UserMeal
from apps.activities.models import UserActivity

User = get_user_model()


class Command(BaseCommand):
    help = "Affiche les données d'un utilisateur pour le dashboard"

    def add_arguments(self, parser):
        parser.add_argument(
            "email",
            type=str,
            nargs="?",
            default="achrafrebiai1@gmail.com",
            help="Email de l'utilisateur (défaut: achrafrebiai1@gmail.com)",
        )

    def handle(self, *args, **options):
        email = options["email"]

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"❌ Utilisateur {email} non trouvé")
            )
            return

        self.stdout.write(self.style.SUCCESS(f"\n👤 Données pour: {user.get_full_name()} ({user.email})"))
        self.stdout.write("=" * 70)

        # Glycémie actuelle
        try:
            glycemia = Glycemia.objects.get(user=user)
            self.stdout.write(self.style.WARNING("\n📊 GLYCÉMIE ACTUELLE"))
            self.stdout.write(f"   Valeur: {glycemia.value} {glycemia.unit}")
            self.stdout.write(f"   Tendance: {glycemia.trend}")
            self.stdout.write(f"   Mesurée à: {glycemia.measured_at.strftime('%Y-%m-%d %H:%M')}")
        except Glycemia.DoesNotExist:
            self.stdout.write(self.style.WARNING("\n📊 GLYCÉMIE ACTUELLE"))
            self.stdout.write("   Aucune donnée")

        # Historique glycémie
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        histo_count = GlycemiaHisto.objects.filter(user=user).count()
        histo_today = GlycemiaHisto.objects.filter(
            user=user, measured_at__gte=today_start
        ).count()
        
        self.stdout.write(self.style.WARNING("\n📈 HISTORIQUE GLYCÉMIE"))
        self.stdout.write(f"   Total mesures: {histo_count}")
        self.stdout.write(f"   Mesures aujourd'hui: {histo_today}")
        
        if histo_count > 0:
            recent = GlycemiaHisto.objects.filter(user=user).order_by("-measured_at")[:5]
            self.stdout.write("   5 dernières mesures:")
            for h in recent:
                self.stdout.write(
                    f"      • {h.value} {h.unit} - "
                    f"{h.measured_at.strftime('%Y-%m-%d %H:%M')}"
                )

        # Alertes actives
        active_alerts = UserAlert.objects.filter(user=user, statut=True).select_related("alert")
        self.stdout.write(self.style.WARNING("\n⚠️  ALERTES ACTIVES"))
        if active_alerts.exists():
            for ua in active_alerts:
                self.stdout.write(
                    f"   • {ua.alert.name} (niveau {ua.alert.danger_level}) - "
                    f"{ua.sent_at.strftime('%Y-%m-%d %H:%M')}"
                )
        else:
            self.stdout.write("   Aucune alerte active")

        # Médicaments
        medications = UserMedication.objects.filter(
            user=user, statut=True
        ).select_related("medication")
        self.stdout.write(self.style.WARNING("\n💊 MÉDICAMENTS"))
        if medications.exists():
            for um in medications:
                taken_info = (
                    f"Pris à {um.taken_at.strftime('%H:%M')}"
                    if um.taken_at
                    else "Pas encore pris"
                )
                next_dose = (
                    um.taken_at + timedelta(hours=um.medication.interval_h)
                    if um.taken_at and um.medication.interval_h
                    else None
                )
                next_info = (
                    f" | Prochain: {next_dose.strftime('%H:%M')}"
                    if next_dose
                    else ""
                )
                self.stdout.write(
                    f"   • {um.medication.name} ({um.medication.dosage}) - "
                    f"Tous les {um.medication.interval_h}h | {taken_info}{next_info}"
                )
        else:
            self.stdout.write("   Aucun médicament actif")

        # Repas du jour
        meals_today = UserMeal.objects.filter(
            user=user, taken_at__gte=today_start
        ).select_related("meal")
        total_calories = sum(m.meal.calories or 0 for m in meals_today)
        
        self.stdout.write(self.style.WARNING("\n🍽️  REPAS DU JOUR"))
        self.stdout.write(f"   Total calories: {total_calories} / 1800 kcal")
        if meals_today.exists():
            for um in meals_today.order_by("taken_at"):
                self.stdout.write(
                    f"   • {um.meal.name} - {um.meal.calories} kcal - "
                    f"{um.taken_at.strftime('%H:%M')}"
                )
        else:
            self.stdout.write("   Aucun repas enregistré aujourd'hui")

        # Activités du jour
        activities_today = UserActivity.objects.filter(
            user=user, start__gte=today_start
        ).select_related("activity")
        total_minutes = sum(
            (ua.end - ua.start).total_seconds() / 60 for ua in activities_today
        )
        
        self.stdout.write(self.style.WARNING("\n🏃 ACTIVITÉS DU JOUR"))
        self.stdout.write(f"   Durée totale: {int(total_minutes)} minutes")
        if activities_today.exists():
            for ua in activities_today.order_by("start"):
                duration = (ua.end - ua.start).total_seconds() / 60
                self.stdout.write(
                    f"   • {ua.activity.name} - {int(duration)} min - "
                    f"{ua.start.strftime('%H:%M')} à {ua.end.strftime('%H:%M')}"
                )
        else:
            self.stdout.write("   Aucune activité enregistrée aujourd'hui")

        # Statistiques générales
        self.stdout.write(self.style.WARNING("\n📊 STATISTIQUES GÉNÉRALES"))
        
        week_ago = now - timedelta(days=7)
        week_meals = UserMeal.objects.filter(user=user, taken_at__gte=week_ago).count()
        week_activities = UserActivity.objects.filter(user=user, start__gte=week_ago).count()
        total_alerts = UserAlert.objects.filter(user=user).count()
        
        self.stdout.write(f"   Repas (7 derniers jours): {week_meals}")
        self.stdout.write(f"   Activités (7 derniers jours): {week_activities}")
        self.stdout.write(f"   Alertes totales: {total_alerts}")

        self.stdout.write(self.style.SUCCESS("\n" + "=" * 70))
        self.stdout.write(self.style.SUCCESS("✨ Données affichées avec succès!\n"))
