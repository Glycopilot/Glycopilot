from dataclasses import dataclass
from typing import Optional


@dataclass
class WidgetDefinition:
    widget_id: str
    title: str
    default_refresh_interval: int
    min_refresh_interval: int
    can_hide: bool
    default_size: str
    allowed_sizes: list[str]
    description: Optional[str] = None


class WidgetCatalog:
    """
    Catalogue des widgets disponibles avec leurs contraintes.
    """

    WIDGETS = {
        "glucose_live": WidgetDefinition(
            widget_id="glucose_live",
            title="Glucose Live",
            default_refresh_interval=60,
            min_refresh_interval=30,
            can_hide=False,
            default_size="expanded",
            allowed_sizes=["normal", "expanded"],
            description="Real-time glucose monitoring",
        ),
        "alerts": WidgetDefinition(
            widget_id="alerts",
            title="Alerts",
            default_refresh_interval=60,
            min_refresh_interval=30,
            can_hide=False,
            default_size="compact",
            allowed_sizes=["compact", "normal"],
            description="Critical alerts and notifications",
        ),
        "medications": WidgetDefinition(
            widget_id="medications",
            title="Medications",
            default_refresh_interval=300,
            min_refresh_interval=60,
            can_hide=True,
            default_size="normal",
            allowed_sizes=["compact", "normal", "expanded"],
            description="Medication schedule and reminders",
        ),
        "nutrition": WidgetDefinition(
            widget_id="nutrition",
            title="Nutrition",
            default_refresh_interval=300,
            min_refresh_interval=60,
            can_hide=True,
            default_size="normal",
            allowed_sizes=["compact", "normal", "expanded"],
            description="Daily nutrition tracking",
        ),
        "activity": WidgetDefinition(
            widget_id="activity",
            title="Activity",
            default_refresh_interval=300,
            min_refresh_interval=60,
            can_hide=True,
            default_size="normal",
            allowed_sizes=["compact", "normal", "expanded"],
            description="Physical activity tracking",
        ),
        "health_score": WidgetDefinition(
            widget_id="health_score",
            title="Health Score",
            default_refresh_interval=600,
            min_refresh_interval=300,
            can_hide=True,
            default_size="compact",
            allowed_sizes=["compact", "normal"],
            description="Overall health score indicator",
        ),
    }

    MAX_WIDGETS = 10

    @classmethod
    def get_widget(cls, widget_id: str) -> Optional[WidgetDefinition]:
        return cls.WIDGETS.get(widget_id)

    @classmethod
    def widget_exists(cls, widget_id: str) -> bool:
        return widget_id in cls.WIDGETS

    @classmethod
    def get_all_widgets(cls) -> list[WidgetDefinition]:
        return list(cls.WIDGETS.values())

    @classmethod
    def get_default_widgets(cls) -> list[str]:
        """Return widget IDs that should be enabled by default."""
        return ["glucose_live", "alerts", "medications", "nutrition", "activity"]

    @classmethod
    def get_non_hideable_widgets(cls) -> list[str]:
        """Return widget IDs that cannot be hidden."""
        return [w.widget_id for w in cls.WIDGETS.values() if not w.can_hide]

    @classmethod
    def is_valid_size(cls, widget_id: str, size: str) -> bool:
        widget = cls.get_widget(widget_id)
        if not widget:
            return False
        return size in widget.allowed_sizes
