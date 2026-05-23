import re

import requests
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

GEO_API = "https://geo.api.gouv.fr"
ADRESSE_API = "https://api-adresse.data.gouv.fr"
POSTAL_RE = re.compile(r"^\d{5}$")


class FranceCommunesView(APIView):
    """Communes pour un code postal (proxy geo.api.gouv.fr)."""

    permission_classes = [AllowAny]

    def get(self, request):
        postal = (
            request.query_params.get("postal_code")
            or request.query_params.get("codePostal")
            or ""
        ).strip()
        if not POSTAL_RE.fullmatch(postal):
            return Response([])

        try:
            response = requests.get(
                f"{GEO_API}/communes",
                params={"codePostal": postal, "fields": "nom,code"},
                timeout=10,
            )
            response.raise_for_status()
            return Response(response.json())
        except requests.RequestException:
            return Response(
                {"detail": "Impossible de charger les villes pour ce code postal."},
                status=503,
            )


class FranceAddressSearchView(APIView):
    """Recherche d'adresses BAN (proxy api-adresse.data.gouv.fr)."""

    permission_classes = [AllowAny]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        if len(query) < 3:
            return Response({"type": "FeatureCollection", "features": []})

        params = {"q": query, "limit": request.query_params.get("limit", "8")}
        postcode = (request.query_params.get("postcode") or "").strip()
        city = (request.query_params.get("city") or "").strip()
        if POSTAL_RE.fullmatch(postcode):
            params["postcode"] = postcode
        if city:
            params["city"] = city

        try:
            response = requests.get(
                f"{ADRESSE_API}/search/",
                params=params,
                timeout=10,
            )
            response.raise_for_status()
            return Response(response.json())
        except requests.RequestException:
            return Response(
                {"detail": "Service adresse indisponible."},
                status=503,
            )
