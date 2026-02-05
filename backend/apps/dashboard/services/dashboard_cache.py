import hashlib
import json
from datetime import timedelta
from typing import Any, Optional

from django.core.cache import cache


class DashboardCache:
    """
    Gère le cache par utilisateur pour les données du dashboard.
    Clef: dashboard:summary:<user_id>
    """

    CACHE_PREFIX = "dashboard"
    DEFAULT_TTL = 30  # 30 secondes

    @classmethod
    def _make_key(cls, user_id: int, data_type: str) -> str:
        return f"{cls.CACHE_PREFIX}:{data_type}:{user_id}"

    @classmethod
    def get_summary(cls, user_id: int) -> Optional[dict]:
        """Récupère le summary du cache."""
        key = cls._make_key(user_id, "summary")
        return cache.get(key)

    @classmethod
    def set_summary(cls, user_id: int, data: dict, ttl: int = None) -> None:
        """Stocke le summary dans le cache."""
        key = cls._make_key(user_id, "summary")
        cache.set(key, data, ttl or cls.DEFAULT_TTL)

    @classmethod
    def invalidate_summary(cls, user_id: int) -> None:
        """Invalide le cache du summary."""
        key = cls._make_key(user_id, "summary")
        cache.delete(key)

    @classmethod
    def get_widgets(cls, user_id: int) -> Optional[list]:
        """Récupère les widgets du cache."""
        key = cls._make_key(user_id, "widgets")
        return cache.get(key)

    @classmethod
    def set_widgets(cls, user_id: int, data: list, ttl: int = None) -> None:
        """Stocke les widgets dans le cache."""
        key = cls._make_key(user_id, "widgets")
        cache.set(key, data, ttl or cls.DEFAULT_TTL)

    @classmethod
    def invalidate_widgets(cls, user_id: int) -> None:
        """Invalide le cache des widgets."""
        key = cls._make_key(user_id, "widgets")
        cache.delete(key)

    @classmethod
    def invalidate_all(cls, user_id: int) -> None:
        """Invalide tout le cache dashboard pour un utilisateur."""
        cls.invalidate_summary(user_id)
        cls.invalidate_widgets(user_id)
