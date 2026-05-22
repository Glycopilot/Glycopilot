from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from apps.doctors.france_address import (
    fetch_commune_names_for_postal,
    validate_postal_city_match,
)
from apps.doctors.views.france_address_views import FranceCommunesView


class FranceAddressTests(SimpleTestCase):
    def test_postal_94320_thiais(self):
        names = fetch_commune_names_for_postal("94320")
        self.assertIn("Thiais", names)

    def test_postal_city_pairs_live_api(self):
        pairs = [
            ("75001", "Paris"),
            ("69001", "Lyon"),
            ("13001", "Marseille"),
            ("33000", "Bordeaux"),
            ("59000", "Lille"),
            ("94320", "Thiais"),
        ]
        for postal, city in pairs:
            names = fetch_commune_names_for_postal(postal)
            self.assertTrue(names, f"Aucune commune pour {postal}")
            validate_postal_city_match(postal, city)

    def test_wrong_city_rejected(self):
        with self.assertRaises(ValidationError):
            validate_postal_city_match("75001", "Lyon")

    @patch("apps.doctors.views.france_address_views.requests.get")
    def test_france_communes_view_94320(self, mock_get):
        mock_get.return_value = type(
            "R",
            (),
            {
                "raise_for_status": lambda self: None,
                "json": lambda self: [{"nom": "Thiais", "code": "94073"}],
            },
        )()
        from rest_framework.test import APIRequestFactory

        factory = APIRequestFactory()
        request = factory.get("/api/france/communes/", {"postal_code": "94320"})
        response = FranceCommunesView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["nom"], "Thiais")

    @patch("apps.doctors.france_address.requests.get")
    def test_api_unavailable(self, mock_get):
        import requests

        mock_get.side_effect = requests.RequestException("network")
        with self.assertRaises(ValidationError):
            validate_postal_city_match("75001", "Paris")
