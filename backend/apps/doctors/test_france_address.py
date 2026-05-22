from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from apps.doctors.france_address import (
    fetch_commune_names_for_postal,
    validate_postal_city_match,
)


class FranceAddressTests(SimpleTestCase):
    def test_postal_city_pairs_live_api(self):
        pairs = [
            ("75001", "Paris"),
            ("69001", "Lyon"),
            ("13001", "Marseille"),
            ("33000", "Bordeaux"),
            ("59000", "Lille"),
        ]
        for postal, city in pairs:
            names = fetch_commune_names_for_postal(postal)
            self.assertTrue(names, f"Aucune commune pour {postal}")
            validate_postal_city_match(postal, city)

    def test_wrong_city_rejected(self):
        with self.assertRaises(ValidationError):
            validate_postal_city_match("75001", "Lyon")

    @patch("apps.doctors.france_address.requests.get")
    def test_api_unavailable(self, mock_get):
        import requests

        mock_get.side_effect = requests.RequestException("network")
        with self.assertRaises(ValidationError):
            validate_postal_city_match("75001", "Paris")
