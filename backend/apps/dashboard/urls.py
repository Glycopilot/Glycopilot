from django.urls import path
from . import views

urlpatterns = [
    path("summary", views.dashboard_summary, name="dashboard-summary"),
    path("widgets", views.dashboard_widgets, name="dashboard-widgets"),
    path("widgets/layout", views.dashboard_widgets_layout, name="dashboard-widgets-layout"),
    path("widgets/layouts", views.dashboard_widget_layouts, name="dashboard-widget-layouts"),
]
