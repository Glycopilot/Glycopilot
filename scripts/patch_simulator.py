#!/usr/bin/env python3
"""
Simulateur de patch CGM — remplace le vrai capteur en attendant sa réception.

Lit les données d'un patient du dataset CSV et les envoie à l'API Django
comme si c'était le patch qui les transmettait, déclenchant au passage
les prédictions IA en temps réel.

Modes disponibles :
  historical  Envoie toutes les lectures avec leurs timestamps d'origine (import rapide)
  replay      Remappe les timestamps à partir d'aujourd'hui et envoie en continu
              avec un délai configurable entre chaque lecture (simulation live)

Exemples :
  # Import historique complet du patient 001
  python scripts/patch_simulator.py --patient 001 --email patient@example.com --password Test1234!

  # Simulation live accélérée (1 lecture toutes les 0.5s)
  python scripts/patch_simulator.py --patient 001 --email patient@example.com --password Test1234! --mode replay --delay 0.5

  # Simulation avec token JWT déjà obtenu
  python scripts/patch_simulator.py --patient 001 --token <jwt> --mode replay --delay 1

  # Choisir un autre patient du dataset (001 à 016)
  python scripts/patch_simulator.py --patient 005 --email patient@example.com --password Test1234!
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from pathlib import Path

# ── Configuration par défaut ─────────────────────────────────────────────────

DEFAULT_CSV = (
    Path(__file__).parent.parent
    / "backend" / "data" / "datasets" / "glycemia"
    / "BIG-IDEAs-Lab-Glycemic-Variability-and-Wearable-Device-Data.csv"
)
DEFAULT_API = "http://localhost:8006"


# ── Helpers HTTP ─────────────────────────────────────────────────────────────

def _post(url: str, body: dict, headers: dict | None = None) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def login(api_base: str, email: str, password: str) -> str:
    """Authentifie l'utilisateur et retourne le JWT access token."""
    print(f"  Connexion en tant que {email}...")
    resp = _post(f"{api_base}/api/auth/login", {"email": email, "password": password})
    token = resp.get("access")
    if not token:
        print(f"  ERREUR login : {resp}")
        sys.exit(1)
    print("  Connecté.")
    return token


# ── Chargement CSV ────────────────────────────────────────────────────────────

def load_patient_rows(patient_id: str, csv_path: Path) -> list[dict]:
    """Charge toutes les lectures d'un patient depuis le CSV."""
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["participant_id"].strip().lstrip("0") == patient_id.lstrip("0") \
               or row["participant_id"].strip() == patient_id:
                rows.append(row)
    if not rows:
        print(f"  ERREUR : patient '{patient_id}' introuvable dans {csv_path}")
        print(f"  Patients disponibles : 001 à 016")
        sys.exit(1)
    return rows


# ── Remappage des timestamps (mode replay) ────────────────────────────────────

def remap_timestamps(rows: list[dict], anchor: datetime | None = None) -> list[dict]:
    """
    Remappe les timestamps pour que la première lecture corresponde à `anchor`
    (par défaut : maintenant - durée_totale, pour que la dernière lecture = maintenant).
    Conserve les intervalles originaux entre les lectures.
    """
    fmt = "%Y-%m-%d %H:%M:%S"
    original_times = [datetime.strptime(r["datetime"], fmt).replace(tzinfo=timezone.utc) for r in rows]
    total_duration = original_times[-1] - original_times[0]

    if anchor is None:
        # La dernière lecture correspond à "maintenant" → données récentes
        anchor = datetime.now(timezone.utc) - total_duration

    remapped = []
    for row, orig_t in zip(rows, original_times):
        offset = orig_t - original_times[0]
        new_t = anchor + offset
        remapped.append({**row, "_remapped_at": new_t.isoformat()})
    return remapped


# ── Envoi d'une lecture ───────────────────────────────────────────────────────

def send_reading(api_base: str, token: str, row: dict, use_remapped: bool = False) -> bool:
    """Envoie une lecture glycémique à l'API Django. Retourne True si succès."""
    if use_remapped:
        measured_at = row["_remapped_at"]
    else:
        # Mode historical : timestamp original converti en ISO 8601 UTC
        dt = datetime.strptime(row["datetime"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
        measured_at = dt.isoformat()

    payload = {
        "value": float(row["glucose"]),
        "unit": "mg/dL",
        "source": "cgm",
        "measured_at": measured_at,
        "rate": float(row["glucose_roc"]) if row.get("glucose_roc") else None,
    }

    try:
        _post(
            f"{api_base}/api/glycemia/",
            payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"    HTTP {e.code} : {body[:120]}")
        return False
    except urllib.error.URLError as e:
        print(f"    Connexion impossible : {e.reason}")
        return False


# ── Point d'entrée ────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Simulateur de patch CGM — envoie des données CSV vers l'API Django",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--patient", required=True, metavar="ID",
                        help="ID du patient dans le CSV (ex: 001, 005...)")
    parser.add_argument("--email", help="Email du compte Django patient")
    parser.add_argument("--password", help="Mot de passe du compte Django patient")
    parser.add_argument("--token", help="JWT access token (si déjà connecté)")
    parser.add_argument("--mode", choices=["historical", "replay"], default="historical",
                        help="historical = timestamps originaux | replay = remappés à aujourd'hui (défaut: historical)")
    parser.add_argument("--delay", type=float, default=0.0, metavar="SECONDES",
                        help="Délai entre chaque envoi en secondes (défaut: 0 = aussi vite que possible)")
    parser.add_argument("--limit", type=int, default=None, metavar="N",
                        help="Limiter à N lectures (utile pour les tests rapides)")
    parser.add_argument("--api", default=DEFAULT_API, metavar="URL",
                        help=f"URL de base de l'API Django (défaut: {DEFAULT_API})")
    parser.add_argument("--csv", default=str(DEFAULT_CSV), metavar="CHEMIN",
                        help="Chemin vers le fichier CSV")
    args = parser.parse_args()

    if not args.token and not (args.email and args.password):
        parser.error("Fournir --token OU --email + --password")

    print()
    print("=" * 55)
    print("  Glycopilot — Simulateur de Patch CGM")
    print("=" * 55)
    print(f"  Patient CSV   : {args.patient}")
    print(f"  Mode          : {args.mode}")
    print(f"  Délai         : {args.delay}s entre chaque lecture")
    print(f"  API           : {args.api}")
    print()

    # Authentification
    token = args.token or login(args.api, args.email, args.password)

    # Chargement des données
    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"  ERREUR : fichier CSV introuvable : {csv_path}")
        sys.exit(1)

    print(f"  Chargement des données patient {args.patient}...")
    rows = load_patient_rows(args.patient, csv_path)

    if args.limit:
        rows = rows[:args.limit]

    print(f"  {len(rows)} lectures chargées")
    print(f"  Plage originale : {rows[0]['datetime']} → {rows[-1]['datetime']}")

    # Remappage si mode replay
    if args.mode == "replay":
        rows = remap_timestamps(rows)
        print(f"  Timestamps remappés → se terminent à maintenant")

    print()
    print(f"  Démarrage de l'envoi ({args.mode})...")
    print("-" * 55)

    success = 0
    errors = 0
    use_remapped = (args.mode == "replay")

    for i, row in enumerate(rows, 1):
        ts = row.get("_remapped_at") or row["datetime"]
        glucose = float(row["glucose"])

        ok = send_reading(args.api, token, row, use_remapped=use_remapped)
        if ok:
            success += 1
            # Affichage progressif toutes les 10 lectures ou la dernière
            if i % 10 == 0 or i == len(rows):
                print(f"  [{i:4d}/{len(rows)}] {ts[:19]}  glucose={glucose:.1f} mg/dL  ✓  ({success} ok / {errors} err)")
        else:
            errors += 1
            print(f"  [{i:4d}/{len(rows)}] {ts[:19]}  glucose={glucose:.1f} mg/dL  ✗")

        if args.delay > 0 and i < len(rows):
            time.sleep(args.delay)

    print("-" * 55)
    print()
    print(f"  Terminé : {success} envoyées, {errors} erreurs")
    if success > 0:
        print(f"  Les prédictions IA sont visibles sur :")
        print(f"  GET {args.api}/api/glycemia/predictions/latest/")
    print()


if __name__ == "__main__":
    main()
