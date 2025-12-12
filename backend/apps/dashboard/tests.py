"""
Tests pour les endpoints du Dashboard.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from .models import UserWidget, UserWidgetLayout
from apps.glycemia.models import Glycemia
from apps.alerts.models import Alert, UserAlert
from apps.medications.models import Medication, UserMedication


User = get_user_model()


class DashboardAPITestCase(TestCase):
    """Tests pour les endpoints du dashboard."""

    def setUp(self):
        """Setup initial pour tous les tests."""
        # Créer un utilisateur de test
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Test",
            last_name="User"
        )
        
        # Client API authentifié
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        # Créer des données de test
        self.setup_test_data()

    def setup_test_data(self):
        """Créer des données de test pour les différents modules."""
        # Glycémie
        Glycemia.objects.create(
            user=self.user,
            value=110.5,
            unit="mg/dL",
            trend="rising",
            measured_at=timezone.now()
        )

        # Alerte (alert_id est AutoField, pas besoin de le spécifier)
        alert = Alert.objects.create(
            name="Hyperglycémie",
            danger_level=3,
            description="Taux de glucose élevé"
        )
        UserAlert.objects.create(
            user=self.user,
            alert=alert,
            statut=True,
            sent_at=timezone.now()
        )

        # Médicament (medication_id est AutoField)
        medication = Medication.objects.create(
            name="Insuline",
            interval_h=8
        )
        UserMedication.objects.create(
            user=self.user,
            medication=medication,
            start_date=timezone.now().date(),
            statut=True,
            taken_at=timezone.now()
        )

    def test_dashboard_summary_all_modules(self):
        """Test GET /api/v1/dashboard/summary - tous les modules."""
        response = self.client.get("/api/v1/dashboard/summary")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)
        
        data = response.data["data"]
        
        # Vérifier que tous les modules sont présents
        self.assertIn("glucose", data)
        self.assertIn("alerts", data)
        self.assertIn("medication", data)
        self.assertIn("nutrition", data)
        self.assertIn("activity", data)
        self.assertIn("healthScore", data)
        
        # Vérifier les données glucose
        self.assertEqual(data["glucose"]["value"], 110.5)
        self.assertEqual(data["glucose"]["unit"], "mg/dL")
        self.assertEqual(data["glucose"]["trend"], "rising")
        
        print("\n✅ Test dashboard_summary_all_modules: PASSED")
        print(f"Response data: {response.data}")

    def test_dashboard_summary_specific_modules(self):
        """Test GET /api/v1/dashboard/summary?include[]=glucose&include[]=alerts."""
        response = self.client.get(
            "/api/v1/dashboard/summary?include[]=glucose&include[]=alerts"
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        
        # Seuls glucose et alerts doivent être présents
        self.assertIn("glucose", data)
        self.assertIn("alerts", data)
        self.assertIn("healthScore", data)
        
        print("\n✅ Test dashboard_summary_specific_modules: PASSED")
        print(f"Response data: {response.data}")

    def test_dashboard_widgets_default(self):
        """Test GET /api/v1/dashboard/widgets - widgets par défaut."""
        response = self.client.get("/api/v1/dashboard/widgets")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("widgets", response.data)
        
        widgets = response.data["widgets"]
        self.assertIsInstance(widgets, list)
        self.assertGreater(len(widgets), 0)
        
        # Vérifier la structure des widgets
        first_widget = widgets[0]
        self.assertIn("widgetId", first_widget)
        self.assertIn("title", first_widget)
        self.assertIn("refreshInterval", first_widget)
        self.assertIn("visible", first_widget)
        
        print("\n✅ Test dashboard_widgets_default: PASSED")
        print(f"Response data: {response.data}")

    def test_dashboard_widgets_with_data(self):
        """Test GET /api/v1/dashboard/widgets - avec widgets existants."""
        # Créer un widget pour l'utilisateur
        UserWidget.objects.create(
            user=self.user,
            widget_id="glucose_live",
            visible=True,
            refresh_interval=60
        )
        
        response = self.client.get("/api/v1/dashboard/widgets")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        widgets = response.data["widgets"]
        
        self.assertGreater(len(widgets), 0)
        self.assertEqual(widgets[0]["widgetId"], "glucose_live")
        
        print("\n✅ Test dashboard_widgets_with_data: PASSED")
        print(f"Response data: {response.data}")

    def test_dashboard_widget_layouts_default(self):
        """Test GET /api/v1/dashboard/widgets/layouts - layouts par défaut."""
        response = self.client.get("/api/v1/dashboard/widgets/layouts")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("layouts", response.data)
        
        layouts = response.data["layouts"]
        self.assertIsInstance(layouts, list)
        self.assertGreater(len(layouts), 0)
        
        # Vérifier la structure des layouts
        first_layout = layouts[0]
        self.assertIn("widgetId", first_layout)
        self.assertIn("column", first_layout)
        self.assertIn("row", first_layout)
        self.assertIn("size", first_layout)
        self.assertIn("pinned", first_layout)
        
        print("\n✅ Test dashboard_widget_layouts_default: PASSED")
        print(f"Response data: {response.data}")

    def test_dashboard_widgets_layout_update(self):
        """Test PATCH /api/v1/dashboard/widgets/layout - mise à jour layout."""
        layout_data = {
            "layout": [
                {
                    "widgetId": "glucose_live",
                    "column": 0,
                    "row": 0,
                    "size": "expanded",
                    "pinned": True
                },
                {
                    "widgetId": "alerts",
                    "column": 1,
                    "row": 0,
                    "size": "normal",
                    "pinned": False
                },
                {
                    "widgetId": "medications",
                    "column": 0,
                    "row": 1,
                    "size": "compact",
                    "pinned": False
                }
            ]
        }
        
        response = self.client.patch(
            "/api/v1/dashboard/widgets/layout",
            data=layout_data,
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)
        
        data = response.data["data"]
        self.assertIn("layout", data)
        self.assertIn("updatedAt", data)
        
        # Vérifier que les widgets ont été créés/mis à jour
        widgets = UserWidget.objects.filter(user=self.user)
        self.assertEqual(widgets.count(), 3)
        
        layouts = UserWidgetLayout.objects.filter(user=self.user)
        self.assertEqual(layouts.count(), 3)
        
        print("\n✅ Test dashboard_widgets_layout_update: PASSED")
        print(f"Response data: {response.data}")

    def test_dashboard_widgets_layout_invalid_widget(self):
        """Test PATCH /api/v1/dashboard/widgets/layout - widget ID invalide."""
        layout_data = {
            "layout": [
                {
                    "widgetId": "invalid_widget_id",
                    "column": 0,
                    "row": 0,
                    "size": "normal",
                    "pinned": False
                }
            ]
        }
        
        response = self.client.patch(
            "/api/v1/dashboard/widgets/layout",
            data=layout_data,
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        
        print("\n✅ Test dashboard_widgets_layout_invalid_widget: PASSED")
        print(f"Response data: {response.data}")

    def test_dashboard_authentication_required(self):
        """Test que l'authentification est requise."""
        # Client non authentifié
        unauthenticated_client = APIClient()
        
        endpoints = [
            "/api/v1/dashboard/summary",
            "/api/v1/dashboard/widgets",
            "/api/v1/dashboard/widgets/layouts",
        ]
        
        for endpoint in endpoints:
            response = unauthenticated_client.get(endpoint)
            self.assertIn(
                response.status_code,
                [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
            )
        
        print("\n✅ Test dashboard_authentication_required: PASSED")


class DashboardIntegrationTestCase(TestCase):
    """Tests d'intégration pour le dashboard."""

    def setUp(self):
        """Setup initial."""
        self.user = User.objects.create_user(
            email="integration@example.com",
            password="testpass123",
            first_name="Integration",
            last_name="Test"
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_full_dashboard_workflow(self):
        """Test du workflow complet du dashboard."""
        # 1. Récupérer le summary
        response = self.client.get("/api/v1/dashboard/summary")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 2. Récupérer les widgets
        response = self.client.get("/api/v1/dashboard/widgets")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Récupérer les layouts
        response = self.client.get("/api/v1/dashboard/widgets/layouts")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 4. Mettre à jour le layout
        layout_data = {
            "layout": [
                {
                    "widgetId": "glucose_live",
                    "column": 0,
                    "row": 0,
                    "size": "expanded",
                    "pinned": True
                }
            ]
        }
        
        response = self.client.patch(
            "/api/v1/dashboard/widgets/layout",
            data=layout_data,
            format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Vérifier que les layouts ont été mis à jour
        response = self.client.get("/api/v1/dashboard/widgets/layouts")
        layouts = response.data["layouts"]
        self.assertGreater(len(layouts), 0)
        
        print("\n✅ Test full_dashboard_workflow: PASSED")
        print("Full workflow executed successfully")
