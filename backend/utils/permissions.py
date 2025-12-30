"""
Helpers liés aux permissions applicatives.
"""

from functools import wraps

from rest_framework.exceptions import NotAuthenticated, PermissionDenied


def allowed_roles(roles):
    """
    Décorateur simple pour vérifier que l'utilisateur authentifié possède
    un rôle autorisé avant d'exécuter la vue.
    """

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            user = getattr(request, "user", None)

            if not user or not user.is_authenticated:
                raise NotAuthenticated()

            if not hasattr(user, "role") or user.role not in roles:
                raise PermissionDenied("Accès refusé pour ce rôle.")

            return view_func(request, *args, **kwargs)

        return _wrapped_view

    return decorator
