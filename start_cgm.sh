#!/bin/bash

# Script pour démarrer le simulateur CGM en arrière-plan
# Usage: ./start_cgm.sh EMAIL [INTERVAL] [DURATION] [BASE_VALUE] [FAST_MODE]

EMAIL="${1:-achrafrebiai1@gmail.com}"
INTERVAL="${2:-5}"         # Intervalle en minutes
DURATION="${3:-0}"          # Durée en minutes (0 = infinie)
BASE_VALUE="${4:-120}"      # Valeur de base mg/dL
FAST_MODE="${5:-false}"     # true = mode rapide, false = normal

# Préparer l'argument pour Docker
if [ "$FAST_MODE" = "true" ]; then
    FAST_ARG="--fast-mode"
    FAST_LABEL=" (FAST MODE activé 🚀)"
else
    FAST_ARG=""
    FAST_LABEL=""
fi

echo ""
echo "🚀 Démarrage du simulateur CGM$FAST_LABEL..."
echo "   Utilisateur : $EMAIL"
echo "   Intervalle : $INTERVAL minute(s)"
echo "   Durée      : $([ "$DURATION" -eq 0 ] && echo 'infinie' || echo "$DURATION minutes")"
echo "   Base value : $BASE_VALUE mg/dL"
echo ""

# Démarrer le simulateur en arrière-plan dans Docker
docker exec -d glycopilot-back sh -c "\
  python manage.py simulate_cgm $EMAIL \
    --interval $INTERVAL \
    --duration $DURATION \
    --base-value $BASE_VALUE \
    $FAST_ARG \
    > /tmp/cgm_simulator.log 2>&1 &"

echo "✅ Simulateur démarré en arrière-plan"
echo ""
echo "📝 Voir les logs en temps réel:"
echo "   docker exec glycopilot-back tail -f /tmp/cgm_simulator.log"
echo ""
echo "🛑 Arrêter le simulateur:"
echo "   docker exec glycopilot-back pkill -f simulate_cgm"
echo ""
echo "📊 Voir les dernières mesures :"
echo "   docker exec glycopilot-back python manage.py shell -c \"\
from apps.glycemia.models import GlycemiaHisto; \
from apps.users.models import User; \
user = User.objects.get(email='$EMAIL'); \
for e in GlycemiaHisto.objects.filter(user=user, source='cgm').order_by('-measured_at')[:10]: \
    print(f'{e.measured_at.strftime('%H:%M:%S')} - {e.value} mg/dL {e.trend}')\""
echo ""
