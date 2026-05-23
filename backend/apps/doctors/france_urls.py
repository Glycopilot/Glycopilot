from django.urls import path

from .views.france_address_views import FranceAddressSearchView, FranceCommunesView

urlpatterns = [
    path("communes/", FranceCommunesView.as_view(), name="france-communes"),
    path("addresses/search/", FranceAddressSearchView.as_view(), name="france-address-search"),
]
