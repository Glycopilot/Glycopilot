from django.urls import path

from .views import DashboardSummaryView, DashboardWidgetLayoutView, DashboardWidgetsView

urlpatterns = [
    path("summary", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("widgets", DashboardWidgetsView.as_view(), name="dashboard-widgets"),
    path(
        "widgets/layout",
        DashboardWidgetLayoutView.as_view(),
        name="dashboard-widgets-layout",
    ),
]
