from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import UserWidget, UserWidgetLayout
from .serializers import (
    UserWidgetSerializer,
    UserWidgetLayoutSerializer,
    LayoutUpdateSerializer,
    DashboardSummarySerializer,
)
from .services.dashboard_service import get_dashboard_summary
from .services.widget_catalog import get_default_widgets, get_widget_config


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """
    GET /api/v1/dashboard/summary

    Retourne l'agrégation complète du dashboard.
    Query params optionnels: include[]=glucose&include[]=alerts...
    """
    user = request.user

    # Récupérer les modules à inclure
    include = request.query_params.getlist("include[]")
    if not include:
        include = None  # Tous les modules

    # Récupérer les données agrégées
    summary_data = get_dashboard_summary(user, include=include)

    # Sérialiser et retourner
    serializer = DashboardSummarySerializer(summary_data)
    return Response({"data": serializer.data}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_widgets(request):
    """
    GET /api/v1/dashboard/widgets

    Retourne la liste des widgets de l'utilisateur.
    """
    user = request.user

    # Récupérer les widgets de l'utilisateur
    user_widgets = UserWidget.objects.filter(user=user)

    if not user_widgets.exists():
        # Créer les widgets par défaut si l'utilisateur n'en a pas
        default_widgets = get_default_widgets()
        widgets_response = []

        for widget_data in default_widgets:
            widgets_response.append({
                "widgetId": widget_data["widget_id"],
                "title": widget_data["title"],
                "lastUpdated": None,
                "refreshInterval": widget_data["refresh_interval"],
                "visible": widget_data["visible"],
            })

        return Response({"widgets": widgets_response}, status=status.HTTP_200_OK)

    serializer = UserWidgetSerializer(user_widgets, many=True)
    return Response({"widgets": serializer.data}, status=status.HTTP_200_OK)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def dashboard_widgets_layout(request):
    """
    PATCH /api/v1/dashboard/widgets/layout

    Met à jour le layout des widgets de l'utilisateur.
    """
    user = request.user

    # Valider les données d'entrée
    serializer = LayoutUpdateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"error": {"code": "DASHBOARD-LAYOUT-INVALID", "message": "Layout invalide", "details": serializer.errors}},
            status=status.HTTP_400_BAD_REQUEST
        )

    layout_data = serializer.validated_data["layout"]

    # Mettre à jour ou créer les widgets et layouts
    updated_widgets = []
    for widget_data in layout_data:
        widget_id = widget_data["widgetId"]
        config = get_widget_config(widget_id)

        # Upsert UserWidget
        user_widget, _ = UserWidget.objects.update_or_create(
            user=user,
            widget_id=widget_id,
            defaults={
                "visible": True,
                "refresh_interval": config["default_refresh_interval"] if config else 300,
            }
        )

        # Upsert UserWidgetLayout
        user_layout, _ = UserWidgetLayout.objects.update_or_create(
            user=user,
            widget_id=widget_id,
            defaults={
                "column": widget_data["column"],
                "row": widget_data["row"],
                "size": widget_data["size"],
                "pinned": widget_data["pinned"],
            }
        )

        updated_widgets.append({
            "widgetId": widget_id,
            "column": user_layout.column,
            "row": user_layout.row,
            "size": user_layout.size,
            "pinned": user_layout.pinned,
        })

    # Marquer comme invisibles les widgets non présents dans le layout
    current_widget_ids = [w["widgetId"] for w in layout_data]
    UserWidget.objects.filter(user=user).exclude(widget_id__in=current_widget_ids).update(visible=False)

    return Response(
        {
            "data": {
                "layout": updated_widgets,
                "updatedAt": timezone.now().isoformat(),
            }
        },
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_widget_layouts(request):
    """
    GET /api/v1/dashboard/widgets/layouts

    Retourne les layouts des widgets de l'utilisateur.
    """
    user = request.user

    layouts = UserWidgetLayout.objects.filter(user=user)

    if not layouts.exists():
        # Retourner les layouts par défaut
        default_widgets = get_default_widgets()
        layouts_response = [
            {
                "widgetId": w["widget_id"],
                "column": w["column"],
                "row": w["row"],
                "size": w["size"],
                "pinned": w["pinned"],
            }
            for w in default_widgets
        ]
        return Response({"layouts": layouts_response}, status=status.HTTP_200_OK)

    serializer = UserWidgetLayoutSerializer(layouts, many=True)
    return Response({"layouts": serializer.data}, status=status.HTTP_200_OK)
