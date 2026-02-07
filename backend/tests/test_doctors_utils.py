from unittest.mock import patch

from django.test import TestCase, override_settings

from apps.doctors.utils import (
    send_care_team_invitation,
    send_doctor_verification_result_email,
)


class DoctorsUtilsCoverageTests(TestCase):
    @override_settings(DEBUG=True, DEFAULT_FROM_EMAIL="noreply@test.com")
    def test_send_care_team_invitation_debug(self):
        with patch("apps.doctors.utils.send_mail", return_value=1):
            self.assertTrue(
                send_care_team_invitation(
                    "test@example.com", "Doc", "REFERENT_DOCTOR", is_existing_user=True
                )
            )

    @override_settings(DEBUG=True, DEFAULT_FROM_EMAIL="noreply@test.com")
    def test_send_doctor_verification_result_debug(self):
        with patch("apps.doctors.utils.send_mail", return_value=1):
            self.assertTrue(
                send_doctor_verification_result_email(
                    "test@example.com", is_accepted=True
                )
            )
