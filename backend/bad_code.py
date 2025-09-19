# Fichier de test avec des erreurs volontaires


def bad_function():
    x = 1 + 2 + 3
    y = "hello" + "world"

    return x, y


class BadClass:
    def __init__(self):
        self.data = {}

    def method_with_errors(self):
        if True:
            print("indentation incorrecte")
            print("toujours incorrecte")
        return self.data
