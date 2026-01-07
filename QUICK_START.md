# Glycopilot - Guide Rapide

## 1. Démarrer le projet

```bash
./start.sh
```

## 2. S'authentifier ou créer un compte

Lancez l'application mobile et créez un compte ou connectez-vous avec un compte existant.

## 3. Populer la base de données

```bash
# Générer 30 jours de données historiques (remplacez par votre email)
docker exec glycopilot-back python manage.py seed_user_data votre.email@example.com --days 30
```

## 4. Lancer le simulateur CGM

```bash
# Démarrer le CGM (mode normal : 1 mesure toutes les 5 minutes, en continu)
./start_cgm.sh votre.email@example.com

# Démarrer le CGM en mode rapide pour dev/demo (intervalle réduit à 1 minute)
./start_cgm.sh votre.email@example.com 5 0 120 true

# Arrêter le CGM
./stop_cgm.sh
```

## 5. Vérifier les données

```bash
# Voir les dernières mesures (remplacez par votre email)
docker exec glycopilot-back python manage.py shell -c "
from apps.glycemia.models import GlycemiaHisto
from apps.users.models import User
user = User.objects.get(email='votre.email@example.com')
for e in GlycemiaHisto.objects.filter(user=user).order_by('-measured_at')[:10]:
    print(f\"{e.measured_at.strftime('%Y-%m-%d %H:%M')} - {e.value:.1f} mg/dL - {e.source}\")
"
```

---

Le backend est prêt avec des données historiques, et le simulateur CGM génère des nouvelles données en temps réel.

---
