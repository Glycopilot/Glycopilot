"""
Catalogue des widgets disponibles pour le dashboard.
Définit les widgets, leurs contraintes et valeurs par défaut.
"""

WIDGET_CATALOG = {
    "glucose_live": {
        "id": "glucose_live",
        "title": "Glucose Live",
        "description": "Affichage temps réel de la glycémie",
        "default_refresh_interval": 60,
        "default_size": "expanded",
        "default_position": {"column": 0, "row": 0},
        "can_hide": False,  # Widget obligatoire
        "pinned_by_default": True,
    },
    "alerts": {
        "id": "alerts",
        "title": "Alertes",
        "description": "Alertes critiques (top 3)",
        "default_refresh_interval": 300,
        "default_size": "normal",
        "default_position": {"column": 1, "row": 0},
        "can_hide": True,
        "pinned_by_default": False,
    },
    "medications": {
        "id": "medications",
        "title": "Médicaments",
        "description": "Prochaine prise de médicament",
        "default_refresh_interval": 300,
        "default_size": "compact",
        "default_position": {"column": 0, "row": 1},
        "can_hide": True,
        "pinned_by_default": False,
    },
    "nutrition": {
        "id": "nutrition",
        "title": "Nutrition",
        "description": "Calories et glucides des dernières 24h",
        "default_refresh_interval": 600,
        "default_size": "compact",
        "default_position": {"column": 1, "row": 1},
        "can_hide": True,
        "pinned_by_default": False,
    },
    "activity": {
        "id": "activity",
        "title": "Activité",
        "description": "Pas et minutes actives du jour",
        "default_refresh_interval": 600,
        "default_size": "normal",
        "default_position": {"column": 0, "row": 2},
        "can_hide": True,
        "pinned_by_default": False,
    },
}

# Liste des IDs de widgets valides
VALID_WIDGET_IDS = list(WIDGET_CATALOG.keys())

# Widgets qui ne peuvent pas être masqués
REQUIRED_WIDGETS = [wid for wid, config in WIDGET_CATALOG.items() if not config["can_hide"]]

# Nombre maximum de widgets autorisés
MAX_WIDGETS = 10

# Tailles valides
VALID_SIZES = ["compact", "normal", "expanded"]


def get_widget_config(widget_id: str) -> dict | None:
    """Retourne la configuration d'un widget par son ID."""
    return WIDGET_CATALOG.get(widget_id)


def get_default_widgets() -> list[dict]:
    """Retourne la liste des widgets par défaut avec leur configuration."""
    return [
        {
            "widget_id": config["id"],
            "title": config["title"],
            "visible": True,
            "refresh_interval": config["default_refresh_interval"],
            "size": config["default_size"],
            "column": config["default_position"]["column"],
            "row": config["default_position"]["row"],
            "pinned": config["pinned_by_default"],
        }
        for config in WIDGET_CATALOG.values()
    ]


def is_valid_widget_id(widget_id: str) -> bool:
    """Vérifie si un ID de widget est valide."""
    return widget_id in VALID_WIDGET_IDS


def can_hide_widget(widget_id: str) -> bool:
    """Vérifie si un widget peut être masqué."""
    config = get_widget_config(widget_id)
    return config["can_hide"] if config else False
