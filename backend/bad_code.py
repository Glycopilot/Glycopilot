# Fichier de test avec des erreurs volontaires
import os, sys
from datetime import datetime
import json


def bad_function():
    x = 1 + 2 + 3
    y = "hello" + "world"
    unused_variable = "je ne sers à rien"

    # Ligne trop longue qui dépasse 88 caractères et qui va faire échouer flake8
    very_long_string = "Cette ligne est beaucoup trop longue et va dépasser la limite de 88 caractères imposée par flake8 et black"

    return x, y


class BadClass:
    def __init__(self):
        self.data = {}

    def method_with_errors(self):
        if True:
            print("indentation incorrecte")
            print("toujours incorrecte")
        return self.data


# Import non organisé et mal placé
from django.http import JsonResponse
