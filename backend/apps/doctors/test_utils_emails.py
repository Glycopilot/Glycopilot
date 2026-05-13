from unittest import TestCase
from unittest.mock import patch

from apps.doctors import utils


class DoctorUtilsEmailTests(TestCase):
    @patch("apps.doctors.utils.send_mail")
    def test_send_care_team_invitation_existing_user_dashboard_link(self, mock_send_mail):
        result = utils.send_care_team_invitation(
            to_email="doctor@example.com",
            inviter_name="Alice",
            role="DOCTOR",
            is_existing_user=True,
        )

        self.assertTrue(result)
        kwargs = mock_send_mail.call_args.kwargs
        self.assertIn("Invitation de Alice", kwargs["subject"])
        self.assertIn("/dashboard", kwargs["message"])
        self.assertEqual(kwargs["recipient_list"], ["doctor@example.com"])

    @patch("apps.doctors.utils.send_mail")
    def test_send_care_team_invitation_new_user_register_link(self, mock_send_mail):
        result = utils.send_care_team_invitation(
            to_email="new-doctor@example.com",
            inviter_name="Bob",
            role="DOCTOR",
            is_existing_user=False,
        )

        self.assertTrue(result)
        kwargs = mock_send_mail.call_args.kwargs
        self.assertIn("Invitation à rejoindre l'équipe de Bob", kwargs["subject"])
        self.assertIn("/register?email=new-doctor@example.com&role=DOCTOR", kwargs["message"])

    @patch("apps.doctors.utils.send_mail", side_effect=Exception("smtp down"))
    def test_send_care_team_invitation_returns_false_on_email_failure(self, _mock_send_mail):
        result = utils.send_care_team_invitation(
            to_email="fail@example.com",
            inviter_name="Charlie",
            role="DOCTOR",
            is_existing_user=False,
        )

        self.assertFalse(result)

    @patch("apps.doctors.utils.send_mail")
    def test_send_doctor_verification_result_email_accepted(self, mock_send_mail):
        result = utils.send_doctor_verification_result_email(
            to_email="accepted@example.com",
            is_accepted=True,
        )

        self.assertTrue(result)
        kwargs = mock_send_mail.call_args.kwargs
        self.assertIn("validé", kwargs["subject"])
        self.assertIn("/login", kwargs["message"])

    @patch("apps.doctors.utils.send_mail")
    def test_send_doctor_verification_result_email_rejected_with_reason(self, mock_send_mail):
        result = utils.send_doctor_verification_result_email(
            to_email="rejected@example.com",
            is_accepted=False,
            rejection_reason="Documents incomplets",
        )

        self.assertTrue(result)
        kwargs = mock_send_mail.call_args.kwargs
        self.assertIn("Mise à jour", kwargs["subject"])
        self.assertIn("Documents incomplets", kwargs["message"])

    @patch("apps.doctors.utils.send_mail")
    def test_send_doctor_verification_result_email_rejected_default_reason(self, mock_send_mail):
        result = utils.send_doctor_verification_result_email(
            to_email="rejected-default@example.com",
            is_accepted=False,
        )

        self.assertTrue(result)
        kwargs = mock_send_mail.call_args.kwargs
        self.assertIn("Non spécifié.", kwargs["message"])

    @patch("apps.doctors.utils.send_mail", side_effect=Exception("smtp down"))
    def test_send_doctor_verification_result_email_returns_false_on_failure(
        self, _mock_send_mail
    ):
        result = utils.send_doctor_verification_result_email(
            to_email="fail@example.com",
            is_accepted=True,
        )

        self.assertFalse(result)
