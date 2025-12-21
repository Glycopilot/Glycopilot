import statistics
from datetime import timedelta

from django.utils.dateparse import parse_datetime
from django.utils.timezone import now

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Glycemia, GlycemiaHisto
from .serializers import (
    GlycemiaHistoCreateSerializer,
    GlycemiaHistoSerializer,
    GlycemiaSerializer,
)


class GlycemiaViewSet(viewsets.ModelViewSet):
    """
    ViewSet principal pour gérer la glycémie :
    - Glycemia = historique limité à 30 jours (cache étendu)
    - GlycemiaHisto = historique complet (jamais supprimé)
    """

    permission_classes = [IsAuthenticated]
    serializer_class = GlycemiaHistoSerializer

    def get_queryset(self):
        """Renvoie l'historique complet (GlycemiaHisto) du user."""
        return GlycemiaHisto.objects.filter(user=self.request.user).order_by(
            "-measured_at"
        )

    @action(detail=False, methods=["get"], url_path="current")
    def current(self, request):
        """
        GET /api/v1/glucose/current/
        Retourne la dernière valeur de glycémie :
        - Cherchée d'abord dans Glycemia (30 jours)
        - Sinon fallback dans GlycemiaHisto
        """

        # Dernière valeur dans Glycemia (30 jours)
        current = (
            Glycemia.objects.filter(user=request.user).order_by("-measured_at").first()
        )

        if current:
            return Response(GlycemiaSerializer(current).data)

        latest = self.get_queryset().first()
        if not latest:
            return Response(
                {"error": "No glucose readings found"}, status=status.HTTP_404_NOT_FOUND
            )

        return Response(GlycemiaHistoSerializer(latest).data)

    #
    @action(detail=False, methods=["get"], url_path="range")
    def range(self, request):
        """
        GET /api/v1/glucose/range/?days=X
        Retourne l'historique des X derniers jours (1 ≤ X ≤ 30).
        Utilise uniquement la table Glycemia (cache 30 jours).
        """

        days = int(request.query_params.get("days", 7))

        if days < 1 or days > 30:
            return Response({"error": "Days must be between 1 and 30"}, status=400)

        limit = now() - timedelta(days=days)

        entries = Glycemia.objects.filter(
            user=request.user, measured_at__gte=limit
        ).order_by("-measured_at")

        serializer = GlycemiaSerializer(entries, many=True)

        return Response(
            {
                "entries": serializer.data,
                "stats": self._calculate_stats(entries),
                "range_days": days,
            }
        )

    @action(detail=False, methods=["post"], url_path="manual-readings")
    def manual_readings(self, request):
        """
        POST /api/v1/glucose/manual-readings/
        Ajoute une mesure manuelle :
        - crée une entrée dans GlycemiaHisto (historique complet)
        - crée une entrée dans Glycemia (historique 30 jours)
        - nettoie les valeurs Glycemia > 30 jours
        """

        serializer = GlycemiaHistoCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        histo_entry = serializer.save(user=request.user, source="manual")

        self._add_to_month_history(histo_entry)

        self._clean_old_entries(request.user)

        return Response(GlycemiaHistoSerializer(histo_entry).data, status=201)

    def _add_to_month_history(self, histo_entry):
        """Ajoute une mesure dans Glycemia (historique 30 jours)."""
        Glycemia.objects.create(
            user=histo_entry.user,
            measured_at=histo_entry.measured_at,
            value=histo_entry.value,
            unit=histo_entry.unit,
            trend=histo_entry.trend,
            rate=histo_entry.rate,
            source=histo_entry.source,
        )

    def _clean_old_entries(self, user):
        """Supprime les entrées Glycemia plus vieilles que 30 jours."""
        limit = now() - timedelta(days=30)
        Glycemia.objects.filter(user=user, measured_at__lt=limit).delete()

    def _calculate_stats(self, entries):
        """Calcule des statistiques simples sur les valeurs renvoyées."""
        values = [e.value for e in entries]
        if not values:
            return {}

        return {
            "min": min(values),
            "max": max(values),
            "avg": round(sum(values) / len(values), 2),
            "median": round(statistics.median(values), 2)
            if len(values) > 1
            else values[0],
            "count": len(values),
        }
