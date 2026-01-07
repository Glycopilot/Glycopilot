"""
Management command pour peupler les données d'un utilisateur existant.

Usage:
    python manage.py seed_user_data <email> [--days N]
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random

from apps.glycemia.models import Glycemia, GlycemiaHisto
from apps.alerts.models import Alert, UserAlert
from apps.medications.models import Medication, UserMedication
from apps.meals.models import Meal, UserMeal
from apps.activities.models import Activity, UserActivity

User = get_user_model()


class Command(BaseCommand):
    help = "Peuple les données d'un utilisateur existant"

    def add_arguments(self, parser):
        parser.add_argument(
            "email",
            type=str,
            help="Email de l'utilisateur",
        )
        parser.add_argument(
            "--days",
            type=int,
            default=7,
            help="Nombre de jours d'historique à générer (défaut: 7)",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Supprimer les données existantes de cet utilisateur avant de peupler",
        )

    def handle(self, *args, **options):
        email = options["email"]
        num_days = options["days"]
        clear_data = options["clear"]

        # Vérifier que l'utilisateur existe
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Utilisateur {email} non trouvé"))
            return

        self.stdout.write(self.style.SUCCESS(f"🚀 Peuplement des données pour {user.get_full_name()} ({email})"))

        if clear_data:
            self.stdout.write(self.style.WARNING("⚠️  Suppression des données existantes de l'utilisateur..."))
            self.clear_user_data(user)

        # Créer les données de référence si elles n'existent pas
        alerts = self.ensure_alerts()
        self.stdout.write(self.style.SUCCESS(f"✅ {len(alerts)} alertes disponibles"))

        medications = self.ensure_medications()
        self.stdout.write(self.style.SUCCESS(f"✅ {len(medications)} médicaments disponibles"))

        meals = self.ensure_meals()
        self.stdout.write(self.style.SUCCESS(f"✅ {len(meals)} repas disponibles"))

        activities = self.ensure_activities()
        self.stdout.write(self.style.SUCCESS(f"✅ {len(activities)} activités disponibles"))

        # Générer les données pour l'utilisateur
        self.generate_user_data(user, alerts, medications, meals, activities, num_days)

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎉 Peuplement terminé avec succès!\n"
                f"   • {num_days} jours d'historique générés\n"
                f"   • Utilisateur: {email}"
            )
        )

    def clear_user_data(self, user):
        """Supprime toutes les données d'un utilisateur"""
        UserAlert.objects.filter(user=user).delete()
        UserMedication.objects.filter(user=user).delete()
        UserMeal.objects.filter(user=user).delete()
        UserActivity.objects.filter(user=user).delete()
        GlycemiaHisto.objects.filter(user=user).delete()
        Glycemia.objects.filter(user=user).delete()
        self.stdout.write("   → Données supprimées")

    def ensure_alerts(self):
        """Assure que les alertes de référence existent"""
        alerts_data = [
            {
                "name": "Hyperglycémie",
                "glycemia_interval": "180-400",
                "danger_level": 3,
                "description": "Taux de glucose très élevé",
            },
            {
                "name": "Hypoglycémie",
                "glycemia_interval": "0-70",
                "danger_level": 3,
                "description": "Taux de glucose très bas",
            },
            {
                "name": "Glucose élevé",
                "glycemia_interval": "140-180",
                "danger_level": 2,
                "description": "Taux de glucose un peu élevé",
            },
            {
                "name": "Glucose bas",
                "glycemia_interval": "70-80",
                "danger_level": 2,
                "description": "Taux de glucose un peu bas",
            },
            {
                "name": "Médicament oublié",
                "danger_level": 2,
                "description": "Rappel de prise de médicament",
            },
        ]

        alerts = []
        for alert_data in alerts_data:
            alert, _ = Alert.objects.get_or_create(
                name=alert_data["name"],
                defaults=alert_data,
            )
            alerts.append(alert)

        return alerts

    def ensure_medications(self):
        """Assure que les médicaments de référence existent"""
        medications_data = [
            {
                "name": "Insuline Rapide",
                "type": "Insuline",
                "dosage": "10 unités",
                "interval_h": 4,
                "max_duration_d": 365,
            },
            {
                "name": "Insuline Lente",
                "type": "Insuline",
                "dosage": "20 unités",
                "interval_h": 24,
                "max_duration_d": 365,
            },
            {
                "name": "Metformine",
                "type": "Antidiabétique oral",
                "dosage": "850 mg",
                "interval_h": 12,
                "max_duration_d": 365,
            },
            {
                "name": "Gliclazide",
                "type": "Antidiabétique oral",
                "dosage": "30 mg",
                "interval_h": 24,
                "max_duration_d": 365,
            },
        ]

        medications = []
        for med_data in medications_data:
            med, _ = Medication.objects.get_or_create(
                name=med_data["name"],
                defaults=med_data,
            )
            medications.append(med)

        return medications

    def ensure_meals(self):
        """Assure que les repas de référence existent"""
        meals_data = [
            {"name": "Petit déjeuner équilibré", "calories": 400, "glucose": 25.0},
            {"name": "Déjeuner complet", "calories": 700, "glucose": 50.0},
            {"name": "Dîner léger", "calories": 500, "glucose": 35.0},
            {"name": "Collation matinale", "calories": 150, "glucose": 15.0},
            {"name": "Goûter", "calories": 200, "glucose": 20.0},
            {"name": "Salade composée", "calories": 350, "glucose": 15.0},
            {"name": "Sandwich complet", "calories": 450, "glucose": 40.0},
            {"name": "Soupe et pain", "calories": 300, "glucose": 30.0},
        ]

        meals = []
        for meal_data in meals_data:
            meal, _ = Meal.objects.get_or_create(
                name=meal_data["name"],
                defaults=meal_data,
            )
            meals.append(meal)

        return meals

    def ensure_activities(self):
        """Assure que les activités de référence existent"""
        activities_data = [
            {"name": "Marche", "recommended_duration": 30, "calories_burned": 150, "sugar_used": 5.0},
            {"name": "Course à pied", "recommended_duration": 30, "calories_burned": 300, "sugar_used": 10.0},
            {"name": "Vélo", "recommended_duration": 45, "calories_burned": 250, "sugar_used": 8.0},
            {"name": "Natation", "recommended_duration": 30, "calories_burned": 350, "sugar_used": 12.0},
            {"name": "Yoga", "recommended_duration": 60, "calories_burned": 120, "sugar_used": 3.0},
            {"name": "Musculation", "recommended_duration": 45, "calories_burned": 200, "sugar_used": 6.0},
        ]

        activities = []
        for act_data in activities_data:
            activity, _ = Activity.objects.get_or_create(
                name=act_data["name"],
                defaults=act_data,
            )
            activities.append(activity)

        return activities

    def generate_user_data(self, user, alerts, medications, meals, activities, num_days):
        """Génère des données réalistes pour un utilisateur"""
        now = timezone.now()
        trends = ["stable", "rising", "falling"]

        # Glycémie actuelle
        current_glucose = random.uniform(90, 140)
        Glycemia.objects.update_or_create(
            user=user,
            defaults={
                "value": round(current_glucose, 1),
                "unit": "mg/dL",
                "trend": random.choice(trends),
                "measured_at": now,
            }
        )
        self.stdout.write(f"   → Glycémie actuelle: {round(current_glucose, 1)} mg/dL")

        # Historique de glycémie
        histo_count = 0
        for day in range(num_days):
            day_offset = timedelta(days=day)
            # 4 mesures par jour (matin, midi, soir, nuit)
            for hour in [8, 12, 18, 23]:
                measure_time = now - day_offset + timedelta(hours=hour - now.hour)
                glucose_value = random.uniform(80, 160)
                
                GlycemiaHisto.objects.create(
                    user=user,
                    value=round(glucose_value, 1),
                    unit="mg/dL",
                    measured_at=measure_time,
                )
                histo_count += 1

                # Créer des alertes si glycémie hors normes
                if glucose_value > 180:
                    alert = alerts[0]  # Hyperglycémie
                    UserAlert.objects.get_or_create(
                        user=user,
                        alert=alert,
                        defaults={
                            "sent_at": measure_time,
                            "statut": day == 0,  # Active seulement pour aujourd'hui
                        }
                    )
                elif glucose_value < 70:
                    alert = alerts[1]  # Hypoglycémie
                    UserAlert.objects.get_or_create(
                        user=user,
                        alert=alert,
                        defaults={
                            "sent_at": measure_time,
                            "statut": day == 0,
                        }
                    )

        self.stdout.write(f"   → {histo_count} mesures de glycémie créées")

        # Médicaments (2 médicaments actifs)
        selected_meds = random.sample(medications, 2)
        for med in selected_meds:
            UserMedication.objects.get_or_create(
                user=user,
                medication=med,
                defaults={
                    "start_date": (now - timedelta(days=30)).date(),
                    "statut": True,
                    "taken_at": now - timedelta(hours=random.randint(2, 8)),
                }
            )
        self.stdout.write(f"   → {len(selected_meds)} médicaments actifs")

        # Repas (2-4 repas par jour)
        meals_count = 0
        for day in range(num_days):
            num_meals = random.randint(2, 4)
            day_meals = random.sample(meals, num_meals)
            
            for idx, meal in enumerate(day_meals):
                meal_time = now - timedelta(days=day) + timedelta(
                    hours=8 + (idx * 4)
                )
                UserMeal.objects.create(
                    user=user,
                    meal=meal,
                    taken_at=meal_time,
                )
                meals_count += 1

        self.stdout.write(f"   → {meals_count} repas créés")

        # Activités (0-2 activités par jour)
        activities_count = 0
        for day in range(num_days):
            if random.random() > 0.3:  # 70% de chance d'avoir une activité
                num_activities = random.randint(1, 2)
                day_activities = random.sample(activities, num_activities)
                
                for activity in day_activities:
                    start_time = now - timedelta(days=day) + timedelta(
                        hours=random.randint(7, 19)
                    )
                    duration = random.randint(20, 90)  # 20-90 minutes
                    
                    UserActivity.objects.create(
                        user=user,
                        activity=activity,
                        start=start_time,
                        end=start_time + timedelta(minutes=duration),
                    )
                    activities_count += 1

        self.stdout.write(f"   → {activities_count} activités créées")

        # Ajouter quelques alertes actives
        alerts_count = 0
        if random.random() > 0.5:
            alert = random.choice(alerts)
            UserAlert.objects.get_or_create(
                user=user,
                alert=alert,
                defaults={
                    "sent_at": now - timedelta(hours=random.randint(1, 6)),
                    "statut": True,
                }
            )
            alerts_count += 1

        if alerts_count > 0:
            self.stdout.write(f"   → {alerts_count} alerte(s) active(s)")
