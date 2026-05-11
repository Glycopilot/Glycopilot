"""
Import medications from either:
  - Local custom CSV  (default, fichier data/import/medications.csv)
  - BDPM official file (--bdpm, fichier CIS_bdpm.txt téléchargé depuis
    base-donnees-publique.medicaments.gouv.fr (page Téléchargement))

Usage:
  python manage.py import_medications              # CSV local (15 médicaments diabète)
  python manage.py import_medications --bdpm       # BDPM complet (~15 000 médicaments)
  python manage.py import_medications --bdpm --file /path/to/CIS_bdpm.txt
"""

import csv
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.medications.models import Medication

# Colonnes du fichier BDPM CIS_bdpm.txt (séparateur \t)
# Ref: base-donnees-publique.medicaments.gouv.fr (doc format CIS-CIP-COMPO)
BDPM_COL_CIS = 0  # Code CIS
BDPM_COL_NAME = 1  # Dénomination
BDPM_COL_FORM = 2  # Forme pharmaceutique
BDPM_COL_ROUTE = 3  # Voie d'administration
BDPM_COL_MARKETING = 6  # État de commercialisation


class Command(BaseCommand):
    help = "Import medications from local CSV or BDPM official file"

    def add_arguments(self, parser):
        parser.add_argument(
            "--bdpm",
            action="store_true",
            help="Parse BDPM format (CIS_bdpm.txt) instead of local CSV",
        )
        parser.add_argument(
            "--file",
            type=str,
            help="Path to the input file (optional, uses default location if not set)",
        )

    def handle(self, *args, **options):
        use_bdpm = options["bdpm"]
        custom_file = options.get("file")

        data_dir = settings.BASE_DIR / "data" / "import"

        if custom_file:
            file_path = Path(custom_file)
        elif use_bdpm:
            file_path = data_dir / "CIS_bdpm.txt"
        else:
            file_path = data_dir / "medications.csv"

        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Importing medications from: {file_path} "
                f"({'BDPM format' if use_bdpm else 'CSV format'})"
            )
        )

        if not file_path.exists():
            if use_bdpm:
                self.stdout.write(
                    self.style.ERROR(
                        f"Fichier BDPM non trouvé : {file_path}\n"
                        "Téléchargez CIS_bdpm.txt depuis la page Téléchargement BDPM\n"
                        f"et placez-le dans {data_dir}/"
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"Fichier non trouvé : {file_path}")
                )
            return

        if use_bdpm:
            self._import_bdpm(file_path)
        else:
            self._import_csv(file_path)

    @staticmethod
    def _is_commercialised(cols: list) -> bool:
        status = cols[BDPM_COL_MARKETING].strip().lower()
        return "commercialisé" in status or "autorisé" in status

    def _import_bdpm(self, path: Path):
        """Parse le fichier officiel CIS_bdpm.txt (tab-séparé, encodage latin-1)."""
        count_created = count_updated = count_skipped = 0

        with open(
            path, "r", encoding="latin-1"
        ) as f:  # NOSONAR - chemin validé avant appel
            for line in f:
                cols = line.rstrip("\n").split("\t")
                if len(cols) < 7:
                    continue

                if not self._is_commercialised(cols):
                    count_skipped += 1
                    continue

                try:
                    cis_code = cols[BDPM_COL_CIS].strip()
                    name = cols[BDPM_COL_NAME].strip()
                    form = cols[BDPM_COL_FORM].strip() or None
                    route = cols[BDPM_COL_ROUTE].strip() or None

                    if not cis_code or not name:
                        continue

                    _, created = Medication.objects.update_or_create(
                        cis_code=cis_code,
                        defaults={"name": name, "form": form, "route": route},
                    )
                    if created:
                        count_created += 1
                    else:
                        count_updated += 1

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Erreur ligne: {e}"))

        self.stdout.write(
            self.style.SUCCESS(
                f"BDPM import terminé : {count_created} créés, "
                f"{count_updated} mis à jour, {count_skipped} ignorés (non commercialisés)"
            )
        )

    def _import_csv(self, path: Path):
        """Parse le CSV local custom (format Glycopilot)."""
        count_created = count_updated = 0

        with open(
            path, "r", encoding="utf-8"
        ) as f:  # NOSONAR - chemin validé avant appel
            reader = csv.DictReader(f)

            for row in reader:
                try:
                    medication_id = int(row["id"])
                    interval_h = (
                        int(row["interval_h"]) if row.get("interval_h") else None
                    )
                    max_duration_d = (
                        int(row["max_duration_d"])
                        if row.get("max_duration_d")
                        else None
                    )

                    obj, created = Medication.objects.update_or_create(
                        medication_id=medication_id,
                        defaults={
                            "name": row["name"],
                            "type": row.get("type") or "",
                            "dosage": row.get("dosage") or "",
                            "interval_h": interval_h,
                            "max_duration_d": max_duration_d,
                        },
                    )
                    if created:
                        count_created += 1
                    else:
                        count_updated += 1

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"Erreur médicament ID {row.get('id')}: {e}")
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"CSV import terminé : {count_created} créés, {count_updated} mis à jour."
            )
        )
