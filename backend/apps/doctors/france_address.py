import unicodedata

import requests
from rest_framework.exceptions import ValidationError

GEO_API = "https://geo.api.gouv.fr"
ADRESSE_API = "https://api-adresse.data.gouv.fr"


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


def _normalize_address_token(value):
    return _normalize_name(value).replace(" ", "").replace("-", "")


def _address_matches_feature(address, properties):
    norm_input = _normalize_address_token(address)
    if not norm_input:
        return False
    label = _normalize_address_token(properties.get("label", ""))
    name = _normalize_address_token(properties.get("name", ""))
    return (
        norm_input in label
        or label in norm_input
        or norm_input in name
        or name in norm_input
        or norm_input == name
    )


def validate_street_address_in_ban(postal_code, city_name, address):
    """L'adresse doit exister dans la BAN (api-adresse.data.gouv.fr)."""
    addr = (address or "").strip()
    if len(addr) < 3:
        raise ValidationError(
            {"medical_center_address": "Adresse trop courte (min. 3 caractères)."}
        )

    try:
        response = requests.get(
            f"{ADRESSE_API}/search/",
            params={
                "q": addr,
                "postcode": postal_code,
                "city": city_name,
                "limit": 8,
            },
            timeout=5,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise ValidationError(
            {"medical_center_address": "Service adresse indisponible, réessayez."}
        ) from exc

    features = response.json().get("features") or []
    matches = [
        f
        for f in features
        if (f.get("properties") or {}).get("postcode") == postal_code
        and _address_matches_feature(addr, f.get("properties") or {})
    ]
    if not matches:
        raise ValidationError(
            {
                "medical_center_address": (
                    "Adresse non reconnue. Choisissez une proposition "
                    "dans la liste (base officielle France)."
                )
            }
        )
    return addr
