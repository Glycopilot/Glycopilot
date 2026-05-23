#!/usr/bin/env bash
# Vérifie que chaque code postal est lié à sa ville (API geo.api.gouv.fr — France)
set -euo pipefail

GEO_API="https://geo.api.gouv.fr/communes"

normalize() {
  echo "$1" | iconv -f UTF-8 -t ASCII//TRANSLIT 2>/dev/null | tr '[:upper:]' '[:lower:]' || echo "$1" | tr '[:upper:]' '[:lower:]'
}

check_pair() {
  local postal="$1"
  local expected_city="$2"
  local names
  names=$(curl -sf "${GEO_API}?codePostal=${postal}&fields=nom" | python3 -c "
import json,sys,unicodedata
data=json.load(sys.stdin)
def norm(s):
    s=unicodedata.normalize('NFD',s or '')
    return ''.join(c for c in s if unicodedata.category(c)!='Mn').lower().strip()
city=norm('${expected_city}')
names=[norm(c['nom']) for c in data]
print('OK' if city in names else 'FAIL')
print('|'.join(sorted({c['nom'] for c in data})))
")
  local status cities
  status=$(echo "$names" | head -1)
  cities=$(echo "$names" | tail -1)
  if [ "$status" = "OK" ]; then
    echo "✓ ${postal} → ${expected_city} (communes: ${cities})"
  else
    echo "✗ ${postal} ≠ ${expected_city} (communes: ${cities})"
    exit 1
  fi
}

echo "Test liaison code postal ↔ ville (France)"
check_pair "75001" "Paris"
check_pair "69001" "Lyon"
check_pair "13001" "Marseille"
check_pair "33000" "Bordeaux"
check_pair "59000" "Lille"
check_pair "06000" "Nice"
echo "Tous les couples code postal / ville sont valides."
