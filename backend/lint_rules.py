#!/usr/bin/env python3
"""
Linting personnalisé pour vérifier les normes API
Ce script vérifie que le code respecte les standards définis
"""

import os
import re
import sys
from pathlib import Path

def check_api_standards():
    """Vérifier que le code respecte les normes API"""
    errors = []
    warnings = []
    
    # Parcourir tous les fichiers Python
    backend_dir = Path(__file__).parent
    for py_file in backend_dir.glob("**/*.py"):
        if py_file.name in ['__pycache__', 'migrations', 'lint_rules.py']:
            continue
            
        with open(py_file, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
            
            # Vérifier les endpoints
            for i, line in enumerate(lines, 1):
                # Vérifier les patterns d'URLs (ignorer les tests)
                if 'path(' in line and 'api/' in line and 'test' not in py_file.name.lower():
                    if not re.search(r"path\s*\(\s*['\"]api/", line):
                        errors.append(f"{py_file}:{i} - API endpoint must use /api/ prefix")
                
                # Vérifier l'utilisation de JsonResponse sans standards
                if 'JsonResponse(' in line and 'api_response(' not in line:
                    if 'def ' in lines[i-2] or 'def ' in lines[i-3]:
                        errors.append(f"{py_file}:{i} - Must use api_response() instead of JsonResponse() for API responses")
                
                # Vérifier les imports standards
                if 'from django.http import JsonResponse' in line:
                    if 'from .standards import' not in content:
                        warnings.append(f"{py_file}:{i} - Consider importing standards module")
    
    return errors, warnings

def check_response_standards():
    """Vérifier que les réponses suivent les standards"""
    errors = []
    
    backend_dir = Path(__file__).parent
    for py_file in backend_dir.glob("**/*.py"):
        if py_file.name in ['__pycache__', 'migrations', 'standards.py']:
            continue
            
        with open(py_file, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                # Vérifier les JsonResponse manuels
                if 'JsonResponse({' in line:
                    # Chercher les champs obligatoires dans les lignes suivantes
                    next_lines = lines[i:i+10]
                    next_content = '\n'.join(next_lines)
                    
                    required_fields = ['status', 'message', 'timestamp', 'code']
                    missing_fields = []
                    
                    for field in required_fields:
                        if f'"{field}"' not in next_content and f"'{field}'" not in next_content:
                            missing_fields.append(field)
                    
                    if missing_fields:
                        errors.append(f"{py_file}:{i} - Manual JsonResponse missing fields: {missing_fields}. Use api_response() instead.")
    
    return errors

def main():
    """Fonction principale de linting"""
    print("🔍 Vérification des normes API...")
    
    # Vérifier les standards API
    api_errors, api_warnings = check_api_standards()
    
    # Vérifier les standards de réponse
    response_errors = check_response_standards()
    
    # Afficher les résultats
    all_errors = api_errors + response_errors
    
    if api_warnings:
        print("\n⚠️  Warnings:")
        for warning in api_warnings:
            print(f"  {warning}")
    
    if all_errors:
        print("\n❌ Erreurs de conformité API:")
        for error in all_errors:
            print(f"  {error}")
        
        print(f"\n🚫 {len(all_errors)} erreur(s) trouvée(s). Le code ne respecte pas les normes API.")
        return 1
    else:
        print("\n✅ Toutes les normes API sont respectées!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
