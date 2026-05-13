from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings
import requests

from apps.doctors.services.verification import DoctorVerificationService


class DoctorVerificationServiceTests(TestCase):
    @override_settings(LICENCE_VERIFICATION_API=None)
    def test_verify_license_returns_false_when_api_not_configured(self):
        result = DoctorVerificationService.verify_license("12345678901")
        self.assertFalse(result)

    @override_settings(LICENCE_VERIFICATION_API="https://example.com/fhir/Practitioner")
    def test_verify_license_returns_false_when_license_missing(self):
        result = DoctorVerificationService.verify_license("")
        self.assertFalse(result)

    @override_settings(LICENCE_VERIFICATION_API="https://example.com/fhir/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_returns_true_for_valid_fhir_bundle(self, mock_get):
        response = MagicMock()
        response.status_code = 200
        response.json.return_value = {
            "resourceType": "Bundle",
            "total": 1,
            "entry": [{"resource": {"id": "abc"}}],
        }
        mock_get.return_value = response

        result = DoctorVerificationService.verify_license("12345678901")

        self.assertTrue(result)
        self.assertIn("identifier=12345678901", mock_get.call_args.args[0])

    @override_settings(LICENCE_VERIFICATION_API="https://example.com/fhir/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_returns_false_for_non_200(self, mock_get):
        response = MagicMock()
        response.status_code = 500
        mock_get.return_value = response

        result = DoctorVerificationService.verify_license("12345678901")

        self.assertFalse(result)

    @override_settings(LICENCE_VERIFICATION_API="https://example.com/fhir/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_returns_false_when_json_invalid(self, mock_get):
        response = MagicMock()
        response.status_code = 200
        response.json.side_effect = requests.exceptions.JSONDecodeError(
            "invalid json", "x", 0
        )
        mock_get.return_value = response

        result = DoctorVerificationService.verify_license("12345678901")

        self.assertFalse(result)

    @override_settings(LICENCE_VERIFICATION_API="https://example.com/fhir/Practitioner")
    @patch("apps.doctors.services.verification.requests.get")
    def test_verify_license_returns_false_on_request_exception(self, mock_get):
        mock_get.side_effect = requests.RequestException("timeout")

        result = DoctorVerificationService.verify_license("12345678901")

        self.assertFalse(result)
