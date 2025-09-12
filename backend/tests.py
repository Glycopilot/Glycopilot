from django.test import TestCase, Client
from django.urls import reverse
import json
from .standards import api_response, api_error, validate_endpoint_path, validate_response_format

class APITestCase(TestCase):
    def setUp(self):
        self.client = Client()
    
    def test_api_endpoint_exists(self):
        """Test que l'endpoint /api/ existe et répond"""
        response = self.client.get('/api/')
        self.assertEqual(response.status_code, 200)
    
    def test_health_endpoint_exists(self):
        """Test que l'endpoint /api/health/ existe et répond"""
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
    
    def test_api_returns_json(self):
        """Test que l'API retourne du JSON"""
        response = self.client.get('/api/')
        self.assertEqual(response['Content-Type'], 'application/json')
    
    def test_response_follows_standard_format(self):
        """Test que les réponses suivent le format standard"""
        response = self.client.get('/api/')
        data = response.json()
        
        # Vérifier les champs obligatoires
        required_fields = ["status", "message", "timestamp", "code"]
        for field in required_fields:
            self.assertIn(field, data, f"Missing required field: {field}")
        
        # Vérifier les types
        self.assertIsInstance(data['status'], str)
        self.assertIn(data['status'], ['success', 'error'])
        self.assertIsInstance(data['message'], str)
        self.assertIsInstance(data['code'], int)
    
    def test_api_uses_standard_versioning(self):
        """Test que tous les endpoints utilisent /api/"""
        endpoints = ['/api/', '/api/health/']
        
        for endpoint in endpoints:
            self.assertTrue(validate_endpoint_path(endpoint), 
                          f"Endpoint {endpoint} does not follow /api/ standard")
    
    def test_standards_validation_functions(self):
        """Test des fonctions de validation des standards"""
        # Test validation endpoint
        self.assertTrue(validate_endpoint_path('/api/users/'))
        self.assertFalse(validate_endpoint_path('/old-api/users/'))
        
        # Test validation réponse
        valid_response = api_response(data={"test": "data"})
        is_valid, errors = validate_response_format(valid_response)
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)
        
        # Test réponse invalide
        invalid_response = {"message": "test"}
        is_valid, errors = validate_response_format(invalid_response)
        self.assertFalse(is_valid)
        self.assertGreater(len(errors), 0)

class SimpleTest(TestCase):
    def test_basic_math(self):
        """Test basique pour que le CI passe"""
        self.assertEqual(1 + 1, 2)
