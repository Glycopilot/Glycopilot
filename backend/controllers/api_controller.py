# API Controller - Gestion des endpoints API
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

@api_view(['GET'])
def health_check(request):
    """
    Endpoint de vérification de santé de l'API
    """
    return Response({
        'status': 'healthy',
        'message': 'API is running',
        'version': '1.0.0'
    }, status=status.HTTP_200_OK)

# Exemple de contrôleur pour les utilisateurs
# @api_view(['GET', 'POST'])
# def user_list(request):
#     if request.method == 'GET':
#         # Logique pour récupérer les utilisateurs
#         pass
#     elif request.method == 'POST':
#         # Logique pour créer un utilisateur
#         pass

# Exemple de contrôleur pour les produits
# @api_view(['GET', 'PUT', 'DELETE'])
# def product_detail(request, pk):
#     if request.method == 'GET':
#         # Logique pour récupérer un produit
#         pass
#     elif request.method == 'PUT':
#         # Logique pour modifier un produit
#         pass
#     elif request.method == 'DELETE':
#         # Logique pour supprimer un produit
#         pass
