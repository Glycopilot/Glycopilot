import unicodedata

import requests
from rest_framework.exceptions import ValidationError

GEO_API = "https://geo.api.gouv.fr"


def _normalize_name(value):
    text = unicodedata.normalize("NFD", value or "")
    stripped = "".join(c for c in text if unicodedata.category(c) != "Mn")
    return stripped.lower().strip()


def fetch_commune_names_for_postal(postal_code):
    response = requests.get(
        f"{GEO_API}/communes",
        params={"codePostal": postal_code, "fields": "nom"},
        timeout=5,
    )
    response.raise_for_status()
    return [item["nom"] for item in response.json()]


def validate_postal_city_match(postal_code, city_name):
    try:
        commune_names = fetch_commune_names_for_postal(postal_code)
    except requests.RequestException as exc:
        raise ValidationError(
            {"medical_center_postal_code": "Service adresse indisponible, réessayez."}
        ) from exc

    if not commune_names:
        raise ValidationError(
            {"medical_center_postal_code": "Code postal inconnu en France."}
        )

    normalized_city = _normalize_name(city_name)
    allowed = {_normalize_name(name) for name in commune_names}
    if normalized_city not in allowed:
        raise ValidationError(
            {"medical_center_city": "La ville ne correspond pas au code postal."}
        )

    return city_name.strip()
