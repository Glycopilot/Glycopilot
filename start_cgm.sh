#!/bin/bash

# Script pour démarrer le simulateur CGM en arrière-plan

EMAIL="${1:-achrafrebiai1@gmail.com}"
INTERVAL="${2:-5}"
DURATION="${3:-0}"
BASE_VALUE="${4:-120}"

echo " Démarrage du simulateur CGM..."
echo " Utilisateur: $EMAIL"
echo " Intervalle: $INTERVAL minutes"
echo "Durée: $([ "$DURATION" -eq 0 ] && echo 'infinie' || echo "$DURATION minutes")"
echo "Valeur de base: $BASE_VALUE mg/dL"
echo ""

# Démarrer le simulateur en arrière-plan
docker exec -d glycopilot-back sh -c "\
  python manage.py simulate_cgm $EMAIL \
    --interval $INTERVAL \
    --duration $DURATION \
    --base-value $BASE_VALUE \
    > /tmp/cgm_simulator.log 2>&1 &"

echo " wwwww Simulateur démarré en arrière-plan wwwww"
echo ""
echo "📝 Voir les logs en temps réel:"
echo "   docker exec glycopilot-back tail -f /tmp/cgm_simulator.log"
echo ""
echo "🛑 Arrêter le simulateur:"
echo "   docker exec glycopilot-back pkill -f simulate_cgm"
echo ""
echo "Voir les dernières mesures:"
echo "   docker exec glycopilot-back python manage.py shell -c \""
echo "from apps.glycemia.models import GlycemiaHisto"
echo "from apps.users.models import User"
echo "user = User.objects.get(email='$EMAIL')"
echo "for e in GlycemiaHisto.objects.filter(user=user, source='cgm').order_by('-measured_at')[:10]:"
echo "    print(f'{e.measured_at.strftime('%H:%M:%S')} - {e.value} mg/dL {e.trend}')"
echo "\""
