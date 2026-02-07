from unittest.mock import Mock, patch

from django.test import TestCase, override_settings

from apps.doctors.services.verification import DoctorVerificationService


class DoctorsServicesCoverageTests(TestCase):
    @override_settings(LICENCE_VERIFICATION_API="http://example.com/api")
    def test_verify_license_non_bundle_returns_false(self):
        response = Mock()
        response.status_code = 200
        response.json.return_value = {"resourceType": "Other"}
        with patch("apps.doctors.services.verification.requests.get", return_value=response):
            self.assertFalse(DoctorVerificationService.verify_license("1234"))
