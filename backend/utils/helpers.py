"""Utility helpers for the backend API."""


def format_serializer_errors(errors: dict) -> dict:
    """
    Transforme les erreurs DRF (dict de listes) en un format lisible par le client.

    DRF produit : {"email": ["msg1"], "non_field_errors": ["msg2"]}
    On retourne :
        {
            "error": "message principal (premier trouvé)",
            "errors": {"email": "msg1", "non_field_errors": "msg2"}
        }

    Le champ "error" permet au front d'afficher une alerte simple.
    Le champ "errors" permet d'afficher les erreurs par champ dans un formulaire.
    """
    flat: dict[str, str] = {}

    for field, value in errors.items():
        if isinstance(value, list):
            flat[field] = str(value[0]) if value else "Erreur inconnue."
        elif isinstance(value, dict):
            for subfield, subvalue in value.items():
                msg = subvalue[0] if isinstance(subvalue, list) and subvalue else str(subvalue)
                flat[subfield] = str(msg)
        else:
            flat[field] = str(value)

    # Priorité : non_field_errors > premier champ disponible
    main_error = flat.get("non_field_errors") or next(iter(flat.values()), "Une erreur est survenue.")

    return {"error": main_error, "errors": flat}
