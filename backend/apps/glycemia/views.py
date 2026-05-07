import statistics
from datetime import timedelta

from django.utils.timezone import now

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Glycemia, GlycemiaDataIA, GlycemiaHisto, PersonalModelApproval
from .serializers import (
    GlycemiaDataIASerializer,
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

    def _resolve_user(self):
        """Retourne l'utilisateur cible. Un service/admin peut passer ?user_id=<id>."""
        user_id = self.request.query_params.get("user_id")
        if user_id and self.request.auth == "service_token":
            from apps.users.models import User
            try:
                return User.objects.get(id_user=user_id).auth_account
            except User.DoesNotExist:
                from rest_framework.exceptions import NotFound
                raise NotFound(f"Utilisateur {user_id} introuvable.")
        return self.request.user

    def get_queryset(self):
        """Renvoie l'historique complet (GlycemiaHisto) du user."""
        qs = GlycemiaHisto.objects.filter(user=self._resolve_user()).order_by("-measured_at")
        measured_after = self.request.query_params.get("measured_after")
        if measured_after:
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(measured_after)
            if dt:
                qs = qs.filter(measured_at__gte=dt)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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
        Utilise Glycemia (cache 30 jours avec context et notes).
        """

        try:
            days = int(request.query_params.get("days", 7))
        except (ValueError, TypeError):
            return Response(
                {"error": "Days must be a valid integer"}, status=400
            )

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
            device=histo_entry.device,
            measured_at=histo_entry.measured_at,
            value=histo_entry.value,
            unit=histo_entry.unit,
            trend=histo_entry.trend,
            rate=histo_entry.rate,
            source=histo_entry.source,
            context=histo_entry.context,
            notes=histo_entry.notes,
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


class GlycemiaDataIAViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/glycemia/predictions/          — liste des prédictions (paginée)
    GET /api/glycemia/predictions/{id}/     — détail d'une prédiction
    GET /api/glycemia/predictions/latest/   — dernière prédiction disponible

    Query params :
      ?limit=N   — nombre de résultats (défaut pagination globale)
      ?status=ok|low_confidence|error
      ?source=baseline|lstm|transformer|ensemble
    """

    permission_classes = [IsAuthenticated]
    serializer_class = GlycemiaDataIASerializer

    def get_queryset(self):
        qs = GlycemiaDataIA.objects.filter(user=self.request.user).order_by("-for_time")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        source_filter = self.request.query_params.get("source")
        if source_filter:
            qs = qs.filter(source=source_filter)

        return qs

    @action(detail=False, methods=["get"], url_path="latest")
    def latest(self, request):
        """GET /api/glycemia/predictions/latest/ — dernière prédiction."""
        prediction = self.get_queryset().first()
        if not prediction:
            return Response(
                {"detail": "No prediction available yet."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(GlycemiaDataIASerializer(prediction).data)


class PersonalModelApprovalViewSet(viewsets.ViewSet):
    """
    Endpoint interne — appelé par l'AI service après chaque fine-tuning.
    Crée un enregistrement en attente de validation par l'admin.
    """

    def create(self, request):
        if not isinstance(request.auth, str) or request.auth != "service_token":
            return Response({"detail": "Service token required."}, status=status.HTTP_403_FORBIDDEN)

        patient_id = request.data.get("patient_id")
        version = request.data.get("version", "v1.0")
        if not patient_id:
            return Response({"detail": "patient_id required."}, status=status.HTTP_400_BAD_REQUEST)

        PersonalModelApproval.objects.update_or_create(
            patient_id=patient_id,
            version=version,
            defaults={
                "status": PersonalModelApproval.STATUS_PENDING,
                "mae_15": request.data.get("mae_15"),
                "mae_30": request.data.get("mae_30"),
                "mae_60": request.data.get("mae_60"),
                "approved_at": None,
                "approved_by": None,
            },
        )
        return Response({"status": "created"}, status=status.HTTP_201_CREATED)
