#!/bin/bash

# Script pour arrêter le simulateur CGM

echo "🛑 Arrêt du simulateur CGM..."

# Trouver et arrêter les processus simulate_cgm
PIDS=$(docker exec glycopilot-back ps aux | grep "simulate_cgm" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
    echo "ℹ️  Aucun simulateur en cours d'exécution"
else
    for PID in $PIDS; do
        docker exec glycopilot-back kill $PID 2>/dev/null
    done
    echo "✅ Simulateur arrêté avec succès"
fi
