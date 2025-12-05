"""Views for glycemia app."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils.dateparse import parse_datetime
from django.db.models import Avg, Min, Max, Count
from datetime import datetime, timedelta
import statistics

from .models import Glycemia, GlycemiaHisto, GlycemiaDataIA
from .serializers import (
    GlycemiaSerializer,
    GlycemiaHistoSerializer,
    GlycemiaHistoCreateSerializer,
    GlycemiaHistoryResponseSerializer,
)


class GlycemiaViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les données de glycémie."""
    
    permission_classes = [IsAuthenticated]
    serializer_class = GlycemiaHistoSerializer
    
    def get_queryset(self):
        """Filtrer par utilisateur connecté."""
        return GlycemiaHisto.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        """
        GET /api/v1/glucose/current
        
        Retourne la dernière mesure de glycémie.
        """
        try:
            # Essayer d'abord le cache
            current = Glycemia.objects.get(user=request.user)
            serializer = GlycemiaSerializer(current)
            return Response(serializer.data)
        except Glycemia.DoesNotExist:
            # Sinon, prendre la dernière de l'historique
            latest = self.get_queryset().first()
            if not latest:
                return Response(
                    {'error': 'No glucose readings found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            serializer = GlycemiaHistoSerializer(latest)
            return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='history')
    def history(self, request):
        """
        GET /api/v1/glucose/history
        
        Paramètres query:
        - start: date de début (ISO 8601) ex: 2025-12-04T00:00:00Z
        - end: date de fin (ISO 8601)
        - granularity: 5m, 15m, 1h (optionnel, non implémenté pour V1)
        - source: cgm, manual, all (défaut: all)
        - limit: nombre max de résultats (défaut: 1000)
        
        Exemple:
        /api/v1/glucose/history/?start=2025-12-03T00:00:00Z&end=2025-12-04T23:59:59Z&source=cgm
        """
        # Récupérer les paramètres
        start = request.query_params.get('start')
        end = request.query_params.get('end')
        source = request.query_params.get('source', 'all')
        limit = int(request.query_params.get('limit', 1000))
        
        # Construire la query
        queryset = self.get_queryset()
        
        # Filtrer par dates
        if start:
            start_dt = parse_datetime(start)
            if start_dt:
                queryset = queryset.filter(measured_at__gte=start_dt)
            else:
                return Response(
                    {'error': 'Invalid start date format. Use ISO 8601 format.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if end:
            end_dt = parse_datetime(end)
            if end_dt:
                queryset = queryset.filter(measured_at__lte=end_dt)
            else:
                return Response(
                    {'error': 'Invalid end date format. Use ISO 8601 format.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Filtrer par source
        if source != 'all':
            if source not in ['cgm', 'manual']:
                return Response(
                    {'error': 'Invalid source. Must be: cgm, manual, or all'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            queryset = queryset.filter(source=source)
        
        # Limiter les résultats
        queryset = queryset[:limit]
        
        # Exécuter la requête
        entries = list(queryset)
        
        # Sérialiser
        serializer = GlycemiaHistoSerializer(entries, many=True)
        
        # Calculer les stats
        stats = self._calculate_stats(entries)
        
        # Construire la réponse
        response_data = {
            'entries': serializer.data,
            'next_cursor': None,  # TODO: implémenter pagination cursor-based
            'stats': stats
        }
        
        return Response(response_data)
    
    @action(detail=False, methods=['post'], url_path='manual-readings')
    def manual_readings(self, request):
        """
        POST /api/v1/glucose/manual-readings
        
        Créer une nouvelle mesure manuelle de glycémie.
        
        Body:
        {
            "value": 120,
            "unit": "mg/dL",
            "measured_at": "2025-12-04T08:30:00Z",
            "context": "preprandial",
            "notes": "Before breakfast"
        }
        """
        serializer = GlycemiaHistoCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Créer l'entrée dans l'historique
        histo_entry = serializer.save(
            user=request.user,
            source='manual'
        )
        
        # Mettre à jour le cache (Glycemia)
        self._update_current_cache(histo_entry)
        
        # Retourner la lecture créée
        response_serializer = GlycemiaHistoSerializer(histo_entry)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    def _calculate_stats(self, entries):
        """Calculer les statistiques sur les entrées."""
        if not entries:
            return {}
        
        values = [entry.value for entry in entries]
        
        stats = {
            'min': min(values),
            'max': max(values),
            'avg': round(sum(values) / len(values), 2),
            'count': len(values),
        }
        
        # Calculer la médiane
        if len(values) > 0:
            stats['median'] = round(statistics.median(values), 2)
        
        return stats
    
    def _update_current_cache(self, histo_entry):
        """Mettre à jour le cache Glycemia avec la dernière mesure."""
        Glycemia.objects.update_or_create(
            user=histo_entry.user,
            defaults={
                'measured_at': histo_entry.measured_at,
                'value': histo_entry.value,
                'unit': histo_entry.unit,
                'trend': histo_entry.trend,
                'rate': histo_entry.rate,
                'source': histo_entry.source,
            }
        )